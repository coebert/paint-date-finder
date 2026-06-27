// Scrape trusted venue sources, extract candidate events with Lovable AI,
// and insert them into event_submissions for admin review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Candidate = {
  title: string;
  description?: string | null;
  event_type:
    | "walk_on"
    | "big_game"
    | "competition"
    | "tournament"
    | "speedball"
    | "scenario"
    | "mag_fed"
    | "other";
  event_date: string; // YYYY-MM-DD
  start_time?: string | null; // HH:MM
  end_time?: string | null;
  price_info?: string | null;
  booking_url?: string | null;
  /** Only populated for facebook_group sources where the post mentions a specific venue. */
  venue_name?: string | null;
  venue_location?: string | null;
  /** Verbatim quote from page text containing the date (grounded extraction). */
  source_quote?: string | null;
};

type SourceType = "venue" | "facebook_group";

const SCRAPER_EMAIL = "scraper@findawalkon.local";

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; FindAWalkOnBot/1.0; +https://findawalkon.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  // Strip scripts/styles, then tags, collapse whitespace. Cap at 30k chars.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 30_000);
}

// Firecrawl fallback: JS-renders the page and returns markdown.
// Used when plain fetch yields too little text (SPA shells) or for known
// JS-heavy hosts (e.g. facebook.com).
async function fetchViaFirecrawl(
  url: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 2000,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const md: string = data?.data?.markdown ?? data?.markdown ?? "";
  return md.replace(/\s+/g, " ").trim().slice(0, 30_000);
}

const FIRECRAWL_HOST_PATTERNS = [
  /(^|\.)facebook\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)eventbrite\.co\.uk$/i,
  /(^|\.)eventbrite\.com$/i,
];

function shouldUseFirecrawlFirst(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return FIRECRAWL_HOST_PATTERNS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

async function extractCandidates(
  venueName: string,
  sourceUrl: string,
  pageText: string,
  apiKey: string,
  sourceType: SourceType,
): Promise<Candidate[]> {
  const today = new Date().toISOString().slice(0, 10);

  const isGroup = sourceType === "facebook_group";

  const systemPrompt = isGroup
    ? "You extract upcoming UK paintball events from a Facebook group feed where many different venues post adverts and flyers. " +
      "Each event may be hosted at a different venue. Extract the venue name as stated in the post. " +
      "Only return events with an unambiguous, explicitly stated date AND a clearly identified venue. " +
      "Never guess dates or venues. If either is missing, skip that event. " +
      "GROUNDING: for every event, set source_quote to a verbatim excerpt (max 240 chars) from the page text that mentions the date — never paraphrase. If you cannot find a verbatim date mention, skip the event."
    : "You extract upcoming UK paintball events from venue website text. " +
      "Only return events with an unambiguous, explicitly stated date. " +
      "Never guess or infer dates. If no concrete dates are present, return an empty array. " +
      "GROUNDING: for every event, set source_quote to a verbatim excerpt (max 240 chars) from the page text that mentions the date — never paraphrase. If you cannot find a verbatim date mention, skip the event.";

  const contextLine = isGroup
    ? `Source: Facebook group "${venueName}"\nSource URL: ${sourceUrl}\nToday: ${today}\n\n` +
      `Extract upcoming events (date >= today, within next 12 months) advertised in posts on this group. ` +
      `For each event, set venue_name to the venue hosting it (as named in the post). ` +
      `Set venue_location to the town/county if mentioned.\n`
    : `Venue: ${venueName}\nSource URL: ${sourceUrl}\nToday: ${today}\n\n` +
      `Extract upcoming events (date >= today, within next 12 months) from this page text.\n`;

  const userPrompt =
    contextLine +
    `Return strict JSON via the tool call. Use ISO YYYY-MM-DD for dates and HH:MM (24h) for times.\n\n` +
    `--- PAGE TEXT ---\n${pageText}`;

  const candidateProperties: Record<string, unknown> = {
    title: { type: "string" },
    description: { type: "string" },
    event_type: {
      type: "string",
      enum: [
        "walk_on",
        "big_game",
        "competition",
        "tournament",
        "speedball",
        "scenario",
        "mag_fed",
        "other",
      ],
    },
    event_date: { type: "string", description: "ISO date YYYY-MM-DD" },
    start_time: { type: "string", description: "HH:MM 24h" },
    end_time: { type: "string", description: "HH:MM 24h" },
    price_info: { type: "string" },
    booking_url: { type: "string" },
    source_quote: {
      type: "string",
      description:
        "Verbatim text snippet (max 240 chars) from the page text that contains the explicit date. Copy a real substring; do not paraphrase.",
    },
  };
  const required = ["title", "event_type", "event_date", "source_quote"];

  if (isGroup) {
    candidateProperties.venue_name = {
      type: "string",
      description: "Name of the paintball venue hosting this event",
    };
    candidateProperties.venue_location = {
      type: "string",
      description: "Town, county, or region of the venue if stated",
    };
    required.push("venue_name");
  }

  const body = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "submit_candidates",
          description:
            "Submit extracted candidate paintball events. Only include events with explicit dates.",
          parameters: {
            type: "object",
            properties: {
              candidates: {
                type: "array",
                items: {
                  type: "object",
                  properties: candidateProperties,
                  required,
                  additionalProperties: false,
                },
              },
            },
            required: ["candidates"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "submit_candidates" },
    },
  };

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (res.status === 429) throw new Error("AI rate limit exceeded (429)");
  if (res.status === 402) throw new Error("AI credits exhausted (402)");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return [];
  try {
    const args = JSON.parse(toolCall.function.arguments);
    return Array.isArray(args.candidates) ? args.candidates : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Admin-only: this endpoint runs paid scrape jobs.
  // Cron callers authenticate with the service-role key, a dedicated
  // SCRAPE_CRON_SECRET (preferred), or — as a fallback — the project anon
  // key, which is what pg_cron's net.http_post sends when no other secret is
  // wired into the scheduled SQL. We additionally throttle cron callers to
  // one run per 5 minutes so a leaked anon key can't burn AI credits.
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecretHeader = req.headers.get("x-cron-secret") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const CRON_SECRET = Deno.env.get("SCRAPE_CRON_SECRET") ?? "";
  const isCron =
    (CRON_SECRET && cronSecretHeader === CRON_SECRET) ||
    (bearer && (bearer === SERVICE_KEY || (ANON_KEY && bearer === ANON_KEY)));
  if (!bearer && !isCron) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isCron) {
    try {
      const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: userData } = await userClient.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("no user");
      const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (roleErr || !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    // Throttle cron-style callers: skip if a run started in the last 5 minutes.
    const { data: recent } = await supabase
      .from("scrape_runs")
      .select("id, started_at")
      .gt("started_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();
    if (recent) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "recent run in progress", runId: recent.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  let triggeredBy = "cron";
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.triggeredBy === "manual") triggeredBy = "manual";
    }
  } catch {
    // ignore
  }

  // Create run row
  const { data: runRow, error: runErr } = await supabase
    .from("scrape_runs")
    .insert({ triggered_by: triggeredBy })
    .select("id")
    .single();
  if (runErr || !runRow) {
    return new Response(
      JSON.stringify({ error: `Failed to start run: ${runErr?.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const runId = runRow.id as string;

  // Run the (potentially long) scrape work in the background so that the
  // client gets an immediate 202 and can poll `scrape_runs` for completion.
  // Without this, Facebook group sources that go through Firecrawl + Lovable
  // AI can keep the request open long enough that the browser/client thinks
  // the app has locked up.
  const work = runScrape(supabase, runId, LOVABLE_API_KEY);
  // @ts-ignore — EdgeRuntime is provided by the Deno deploy edge runtime.
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  } else {
    // Local/dev fallback: don't await, just swallow errors.
    work.catch((e) => console.error("[scrape] background work failed", e));
  }

  return new Response(
    JSON.stringify({
      runId,
      status: "running",
      sources_processed: 0,
      candidates_created: 0,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

async function runScrape(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  runId: string,
  LOVABLE_API_KEY: string,
) {
  const { data: sources, error: srcErr } = await supabase
    .from("trusted_venue_sources")
    .select("id, venue_name, url, source_type")
    .eq("is_active", true);

  if (srcErr) {
    await supabase
      .from("scrape_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        errors: [{ stage: "load_sources", message: srcErr.message }],
      })
      .eq("id", runId);
    return;
  }

  const errors: { source: string; message: string }[] = [];
  let processed = 0;
  let candidatesCreated = 0;

  // Load known venues once for fuzzy matching across all sources.
  const { data: venueRows } = await supabase.from("venues").select("name");
  const knownVenues: string[] = (venueRows ?? []).map(
    (r: { name: string }) => r.name,
  );
  const normVenue = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const matchVenue = (name: string): "matched" | "fuzzy" | "unmatched" => {
    if (!name || knownVenues.length === 0) return "unmatched";
    const cn = normVenue(name);
    let best = 0;
    for (const v of knownVenues) {
      const vn = normVenue(v);
      if (vn === cn) return "matched";
      const a = new Set(cn.split(" ").filter(Boolean));
      const b = new Set(vn.split(" ").filter(Boolean));
      let inter = 0;
      for (const t of a) if (b.has(t)) inter++;
      const union = a.size + b.size - inter;
      const score = union === 0 ? 0 : inter / union;
      if (score > best) best = score;
    }
    if (best >= 0.95) return "matched";
    if (best >= 0.5) return "fuzzy";
    return "unmatched";
  };
  const maxFutureDateIso = (() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + 18);
    return d.toISOString().slice(0, 10);
  })();

  for (const source of sources ?? []) {
    processed++;
    let sourceStatus = "ok";
    const t0 = Date.now();
    let textLen = 0;
    let returned = 0;
    let inserted = 0;
    let deduped = 0;
    let invalidDate = 0;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    let usedFirecrawl = false;
    try {
      // Use Firecrawl up-front for known JS-heavy hosts (FB, Eventbrite, …)
      let text: string;
      if (FIRECRAWL_API_KEY && shouldUseFirecrawlFirst(source.url)) {
        text = await fetchViaFirecrawl(source.url, FIRECRAWL_API_KEY);
        usedFirecrawl = true;
      } else {
        try {
          text = await fetchPageText(source.url);
        } catch (fetchErr) {
          // Some venues (e.g. Campaign Paintball) block default fetch with
          // 403/Cloudflare; retry transparently via Firecrawl.
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          if (FIRECRAWL_API_KEY && /\bHTTP (403|401|429|503)\b/.test(msg)) {
            console.log(
              `[scrape] source="${source.venue_name}" plain_fetch_blocked (${msg}) — retrying via Firecrawl`,
            );
            text = await fetchViaFirecrawl(source.url, FIRECRAWL_API_KEY);
            usedFirecrawl = true;
          } else {
            throw fetchErr;
          }
        }
        // Fallback: if plain fetch returned suspiciously little content,
        // retry via Firecrawl (likely an SPA shell).
        if (!usedFirecrawl && text.length < 300 && FIRECRAWL_API_KEY) {
          console.log(
            `[scrape] source="${source.venue_name}" plain_fetch=${text.length} chars — retrying via Firecrawl`,
          );
          text = await fetchViaFirecrawl(source.url, FIRECRAWL_API_KEY);
          usedFirecrawl = true;
        }
      }
      textLen = text.length;
      console.log(
        `[scrape] source="${source.venue_name}" url="${source.url}" fetched_chars=${textLen} firecrawl=${usedFirecrawl}`,
      );

      const sourceType: SourceType =
        (source as { source_type?: string }).source_type === "facebook_group"
          ? "facebook_group"
          : "venue";

      const candidates = await extractCandidates(
        source.venue_name,
        source.url,
        text,
        LOVABLE_API_KEY,
        sourceType,
      );
      returned = candidates.length;
      console.log(
        `[scrape] source="${source.venue_name}" type=${sourceType} ai_returned=${returned}`,
      );

      const pageHaystack = text
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();



      for (const c of candidates) {
        // Hard date guards
        if (!/^\d{4}-\d{2}-\d{2}$/.test(c.event_date)) {
          invalidDate++;
          continue;
        }
        if (c.event_date < new Date().toISOString().slice(0, 10)) {
          invalidDate++;
          continue;
        }
        if (c.event_date > maxFutureDateIso) {
          invalidDate++;
          continue;
        }
        if (!c.title || c.title.trim().length < 3) {
          invalidDate++;
          continue;
        }

        // For facebook_group sources, the venue is per-event (extracted by AI).
        // For venue sources, fall back to the source's venue_name.
        const effectiveVenue = sourceType === "facebook_group"
          ? (c.venue_name?.trim() || "")
          : source.venue_name;

        if (sourceType === "facebook_group" && !effectiveVenue) {
          invalidDate++;
          continue;
        }

        // Grounded verification: source_quote must appear in page text.
        const warnings: string[] = [];
        let quoteVerified = false;
        if (c.source_quote) {
          const needle = c.source_quote
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200);
          if (needle.length >= 6 && pageHaystack.includes(needle)) {
            quoteVerified = true;
          } else {
            const words = needle.split(" ").filter((w) => w.length > 2);
            if (words.length >= 4 && pageHaystack.includes(words.slice(0, 4).join(" "))) {
              quoteVerified = true;
            }
          }
        }
        if (!quoteVerified) {
          // For scraped sources we have the page text, so an unverifiable
          // quote is a strong hallucination signal — skip.
          invalidDate++;
          continue;
        }

        // Venue match
        const venueStatus = matchVenue(effectiveVenue);
        if (venueStatus === "unmatched") warnings.push("unknown_venue");

        // Dedupe: skip if same venue+date+type already in events or pending/approved
        // submissions.
        const [{ data: existingEvent }, { data: existingSub }] =
          await Promise.all([
            supabase
              .from("events")
              .select("id")
              .ilike("venue_name", effectiveVenue)
              .eq("event_date", c.event_date)
              .eq("event_type", c.event_type)
              .limit(1)
              .maybeSingle(),
            supabase
              .from("event_submissions")
              .select("id")
              .ilike("venue_name", effectiveVenue)
              .eq("event_date", c.event_date)
              .eq("event_type", c.event_type)
              .in("status", ["pending", "approved"])
              .limit(1)
              .maybeSingle(),
          ]);
        if (existingEvent || existingSub) {
          deduped++;
          continue;
        }

        const submitterLabel = sourceType === "facebook_group"
          ? `Auto-scraper (FB group: ${source.venue_name})`
          : `Auto-scraper (${source.venue_name})`;

        const { error: insErr } = await supabase
          .from("event_submissions")
          .insert({
            title: c.title.slice(0, 200),
            description: c.description?.slice(0, 2000) ?? null,
            event_type: c.event_type,
            venue_name: effectiveVenue.slice(0, 200),
            venue_location: c.venue_location?.slice(0, 200) ?? null,
            event_date: c.event_date,
            start_time: c.start_time || null,
            end_time: c.end_time || null,
            booking_url: c.booking_url || null,
            price_info: c.price_info?.slice(0, 100) ?? null,
            source_url: source.url,
            source_quote: c.source_quote?.slice(0, 500) ?? null,
            venue_match_status: venueStatus,
            sanity_warnings: warnings,
            submitter_email: SCRAPER_EMAIL,
            submitter_name: submitterLabel,
            status: "pending",
          });
        if (insErr) {
          errors.push({
            source: source.url,
            message: `insert: ${insErr.message}`,
          });
        } else {
          candidatesCreated++;
          inserted++;
        }
      }
    } catch (e) {
      sourceStatus = "error";
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[scrape] source="${source.venue_name}" ERROR ${msg}`,
      );
      errors.push({ source: source.url, message: msg });
    }

    const elapsed = Date.now() - t0;
    console.log(
      `[scrape] source="${source.venue_name}" status=${sourceStatus} ` +
        `chars=${textLen} returned=${returned} inserted=${inserted} ` +
        `deduped=${deduped} invalid_date=${invalidDate} elapsed_ms=${elapsed}`,
    );

    const lastErrorMessage = sourceStatus === "error"
      ? errors.filter((e) => e.source === source.url).slice(-1)[0]?.message ??
        null
      : null;

    await supabase
      .from("trusted_venue_sources")
      .update({
        last_scraped_at: new Date().toISOString(),
        last_status: sourceStatus,
        last_returned: returned,
        last_inserted: inserted,
        last_deduped: deduped,
        last_invalid_date: invalidDate,
        last_chars: textLen,
        last_used_firecrawl: usedFirecrawl,
        last_error_message: lastErrorMessage,
      })
      .eq("id", source.id);
  }

  const status = errors.length === 0
    ? "success"
    : candidatesCreated > 0 || processed > errors.length
    ? "partial"
    : "failed";

  await supabase
    .from("scrape_runs")
    .update({
      finished_at: new Date().toISOString(),
      sources_processed: processed,
      candidates_created: candidatesCreated,
      errors,
      status,
    })
    .eq("id", runId);

}

