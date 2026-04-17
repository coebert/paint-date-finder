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
};

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
): Promise<Candidate[]> {
  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt =
    "You extract upcoming UK paintball events from venue website text. " +
    "Only return events with an unambiguous, explicitly stated date. " +
    "Never guess or infer dates. If no concrete dates are present, return an empty array.";

  const userPrompt =
    `Venue: ${venueName}\nSource URL: ${sourceUrl}\nToday: ${today}\n\n` +
    `Extract upcoming events (date >= today, within next 12 months) from this page text.\n` +
    `Return strict JSON via the tool call. Use ISO YYYY-MM-DD for dates and HH:MM (24h) for times.\n\n` +
    `--- PAGE TEXT ---\n${pageText}`;

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
                  properties: {
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
                    event_date: {
                      type: "string",
                      description: "ISO date YYYY-MM-DD",
                    },
                    start_time: { type: "string", description: "HH:MM 24h" },
                    end_time: { type: "string", description: "HH:MM 24h" },
                    price_info: { type: "string" },
                    booking_url: { type: "string" },
                  },
                  required: ["title", "event_type", "event_date"],
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

  const { data: sources, error: srcErr } = await supabase
    .from("trusted_venue_sources")
    .select("id, venue_name, url")
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
    return new Response(
      JSON.stringify({ error: srcErr.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const errors: { source: string; message: string }[] = [];
  let processed = 0;
  let candidatesCreated = 0;

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
        text = await fetchPageText(source.url);
        // Fallback: if plain fetch returned suspiciously little content,
        // retry via Firecrawl (likely an SPA shell).
        if (text.length < 300 && FIRECRAWL_API_KEY) {
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

      const candidates = await extractCandidates(
        source.venue_name,
        source.url,
        text,
        LOVABLE_API_KEY,
      );
      returned = candidates.length;
      console.log(
        `[scrape] source="${source.venue_name}" ai_returned=${returned}`,
      );

      for (const c of candidates) {
        // Validate date is today or future
        if (!/^\d{4}-\d{2}-\d{2}$/.test(c.event_date)) {
          invalidDate++;
          continue;
        }
        if (c.event_date < new Date().toISOString().slice(0, 10)) {
          invalidDate++;
          continue;
        }

        // Dedupe: skip if same venue+date+type already in events or pending/approved
        // submissions. We intentionally ignore title because the AI returns slight
        // title variations between runs ("Walk-on" vs "Walk on April"), which would
        // otherwise create duplicate candidates for the same real event.
        const [{ data: existingEvent }, { data: existingSub }] =
          await Promise.all([
            supabase
              .from("events")
              .select("id")
              .eq("venue_name", source.venue_name)
              .eq("event_date", c.event_date)
              .eq("event_type", c.event_type)
              .limit(1)
              .maybeSingle(),
            supabase
              .from("event_submissions")
              .select("id")
              .eq("venue_name", source.venue_name)
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

        const { error: insErr } = await supabase
          .from("event_submissions")
          .insert({
            title: c.title.slice(0, 200),
            description: c.description?.slice(0, 2000) ?? null,
            event_type: c.event_type,
            venue_name: source.venue_name,
            venue_location: null,
            event_date: c.event_date,
            start_time: c.start_time || null,
            end_time: c.end_time || null,
            booking_url: c.booking_url || null,
            price_info: c.price_info?.slice(0, 100) ?? null,
            source_url: source.url,
            submitter_email: SCRAPER_EMAIL,
            submitter_name: `Auto-scraper (${source.venue_name})`,
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

  return new Response(
    JSON.stringify({
      runId,
      status,
      sources_processed: processed,
      candidates_created: candidatesCreated,
      errors,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
