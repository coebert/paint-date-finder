// Scrape trusted venue sources, extract candidate events with Lovable AI,
// and insert them into event_submissions for admin review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errors, json, preflight } from "../_shared/http.ts";
import { authorizeAdminOrCron } from "../_shared/supabase.ts";

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

/** Only http(s) URLs are storable (DB check constraints); everything else -> null. */
function httpUrlOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchPageText(url: string): Promise<string> {
  const attempt = (ua: string) =>
    fetch(url, {
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,text/calendar,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      redirect: "follow",
    });

  let res = await attempt(
    "Mozilla/5.0 (compatible; FindAWalkOnBot/1.0; +https://findawalkon.app)",
  );
  // Some hosts (Cloudflare early-data 425, bot filters 403/429) reject the bot UA
  // but serve the same page to a normal browser UA. Retry once before failing.
  if (!res.ok && [403, 425, 429, 503].includes(res.status)) {
    res = await attempt(BROWSER_UA);
  }
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
    throw new FirecrawlError(
      res.status,
      `Firecrawl ${res.status}: ${t.slice(0, 200)}`,
    );
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

  if (!res.ok) {
    const t = res.status >= 400 && res.status < 500 ? await res.text() : "";
    throw new AiGatewayError(res.status, `AI gateway ${res.status}: ${t.slice(0, 300)}`);
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

/** Thrown for any non-2xx Lovable AI Gateway response, carrying the status. */
class AiGatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AiGatewayError";
  }
}

/** Thrown for any non-2xx Firecrawl response, carrying the status. */
class FirecrawlError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "FirecrawlError";
  }
}

/** Loose venue-name comparison so near-identical names dedupe correctly. */
function venueTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "ltd", "paintball", "park", "centre", "center"].includes(w)),
  );
}

function venueNamesMatch(a: string, b: string): boolean {
  const ta = venueTokens(a);
  const tb = venueTokens(b);
  if (ta.size === 0 || tb.size === 0) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size) >= 0.6;
}

/** Background-job identity used for the lease / paused state in job_state. */
const JOB_NAME = "scrape-venue-events";
/** Max sources processed per run (cron). Keeps every run bounded. */
const CRON_BATCH_SIZE = 6;
const MAX_BATCH_SIZE = 25;
/** Backfill lookback ceiling (days). */
const MAX_BACKFILL_DAYS = 90;
/** Sources per run in backfill mode — larger, still bounded. */
const BACKFILL_BATCH_SIZE = 12;

/** Lease TTL — long enough for a full batch, short enough to self-heal. */
const LEASE_TTL_SECONDS = 900;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !LOVABLE_API_KEY) return errors.missingEnv();

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Admin-only: this endpoint runs paid scrape jobs.
  // Cron authentication accepts ONLY the service-role key or the shared
  // x-cron-secret (CRON_SECRET / SCRAPE_CRON_SECRET). The public
  // anon/publishable key is never accepted as authorization. Any other caller
  // must present a user JWT belonging to an admin.
  const auth = await authorizeAdminOrCron(req, {
    supabaseUrl: SUPABASE_URL,
    serviceKey: SERVICE_KEY,
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
  });
  if (!auth.ok) return auth.response;
  

  let triggeredBy = "cron";
  let requestedLimit: number | null = null;
  // Backfill mode: re-scrape every active source that has been missed for the
  // last N days (never scraped, or last scraped before the cutoff).
  let backfillDays: number | null = null;
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (body?.triggeredBy === "manual") triggeredBy = "manual";
    if (typeof body?.limit === "number" && Number.isFinite(body.limit)) {
      requestedLimit = Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(body.limit)));
    }
    const rawDays = body?.backfillDays ?? (body?.mode === "backfill" ? 7 : undefined);
    if (typeof rawDays === "number" && Number.isFinite(rawDays)) {
      backfillDays = Math.max(1, Math.min(MAX_BACKFILL_DAYS, Math.floor(rawDays)));
    }
  }


  // Single-flight lease + paused-state guard. A concurrent run exits here, and
  // a job paused on 402/403 only gets a single probe source until it recovers.
  const { data: begin, error: beginErr } = await supabase.rpc("job_begin", {
    _job: JOB_NAME,
    _ttl_seconds: LEASE_TTL_SECONDS,
  });
  if (beginErr) {
    return json({ error: `Failed to acquire job lease: ${beginErr.message}` }, { status: 500 });
  }
  const beginStatus = (begin as { status?: string } | null)?.status ?? "ok";
  if (beginStatus === "locked") {
    return json({
      skipped: true,
      reason: "another scrape run is already in progress",
    });
  }
  const leaseOwner = (begin as { owner?: string }).owner ?? null;
  const isProbe = beginStatus === "probe";
  // A probe run stays at one source even in backfill mode.
  const isBackfill = !isProbe && backfillDays !== null;
  const batchSize = isProbe
    ? 1
    : (requestedLimit ?? (isBackfill ? BACKFILL_BATCH_SIZE : CRON_BATCH_SIZE));
  // Sources whose last successful check is older than this were "missed".
  const backfillCutoff = isBackfill
    ? new Date(Date.now() - backfillDays! * 86_400_000).toISOString()
    : null;

  // Create run row
  const runLabel = isProbe
    ? `${triggeredBy}:probe`
    : isBackfill
    ? `${triggeredBy}:backfill:${backfillDays}d`
    : triggeredBy;
  const { data: runRow, error: runErr } = await supabase
    .from("scrape_runs")
    .insert({ triggered_by: runLabel })
    .select("id")
    .single();
  if (runErr || !runRow) {
    await supabase.rpc("job_end", { _job: JOB_NAME, _owner: leaseOwner });
    return json({ error: `Failed to start run: ${runErr?.message}` }, { status: 500 });
  }
  const runId = runRow.id as string;

  // Run the (potentially long) scrape work in the background so that the
  // client gets an immediate 202 and can poll `scrape_runs` for completion.
  const work = runScrape(supabase, runId, LOVABLE_API_KEY, {
    batchSize,
    isProbe,
    leaseOwner,
    backfillCutoff,
  }).finally(async () => {
    await supabase.rpc("job_end", { _job: JOB_NAME, _owner: leaseOwner });
  });
  // @ts-ignore — EdgeRuntime is provided by the Deno deploy edge runtime.
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  } else {
    // Local/dev fallback: don't await, just swallow errors.
    work.catch((e) => console.error("[scrape] background work failed", e));
  }

  return json(
    {
      runId,
      status: "running",
      probe: isProbe,
      backfill: isBackfill ? { days: backfillDays, cutoff: backfillCutoff } : null,
      batch_size: batchSize,
      sources_processed: 0,
      candidates_created: 0,
    },
    { status: 202 },
  );

});

async function runScrape(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  runId: string,
  LOVABLE_API_KEY: string,
  opts: {
    batchSize: number;
    isProbe: boolean;
    leaseOwner: string | null;
    /** Backfill mode: only sources last scraped before this ISO timestamp. */
    backfillCutoff?: string | null;
  },
) {

  // Bounded work per run: take the least-recently-scraped active sources so
  // successive scheduled runs rotate through the whole list. `last_scraped_at`
  // is written per source below, which makes progress idempotent — a re-run
  // picks up where the previous one stopped instead of redoing finished work.
  // In backfill mode we narrow to sources missed within the lookback window;
  // sources already checked inside it are skipped, and the per-candidate
  // dedupe below keeps existing events/submissions from being duplicated.
  let query = supabase
    .from("trusted_venue_sources")
    .select("id, venue_name, url, source_type, last_scraped_at")
    .eq("is_active", true);
  if (opts.backfillCutoff) {
    query = query.or(
      `last_scraped_at.is.null,last_scraped_at.lt.${opts.backfillCutoff}`,
    );
  }
  const { data: sources, error: srcErr } = await query
    .order("last_scraped_at", { ascending: true, nullsFirst: true })
    .limit(opts.batchSize);



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

  // Circuit-breaker state. Set on a terminal (402/403) or repeated 429 AI
  // gateway failure; stops the run and parks the job.
  let breaker: { kind: "credits" | "rate_limit"; reason: string } | null = null;
  let rateLimitHits = 0;

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

        // Dedupe: fuzzy match against existing canonical events
        // (same venue, overlapping date ±2 days, similar title) and against
        // pending/approved submissions for the same date+type, comparing venue
        // names loosely so punctuation/spelling drift still dedupes.
        const [dupRes, { data: sameDaySubs }] = await Promise.all([
          supabase.rpc("find_duplicate_event", {
            _venue: effectiveVenue,
            _date: c.event_date,
            _title: c.title,
          }),
          supabase
            .from("event_submissions")
            .select("id, venue_name")
            .eq("event_date", c.event_date)
            .eq("event_type", c.event_type)
            .in("status", ["pending", "approved"])
            .limit(50),
        ]);
        const duplicateEventId = (dupRes.data as string | null) ?? null;
        const existingSub = (sameDaySubs ?? []).find((s) =>
          venueNamesMatch(s.venue_name ?? "", effectiveVenue)
        ) ?? null;

        if (duplicateEventId) {
          // Merge new source info into the canonical event and skip insert
          await supabase.rpc("merge_event_source", {
            _event_id: duplicateEventId,
            _source: {
              source_url: source.url,
              source_quote: c.source_quote ?? null,
              description: c.description ?? null,
              booking_url: httpUrlOrNull(c.booking_url),
              price_info: c.price_info ?? null,
              venue_location: c.venue_location ?? null,
              scraped_by: source.venue_name,
            },
          });
          deduped++;
          continue;
        }
        if (existingSub) {
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
            booking_url: httpUrlOrNull(c.booking_url),
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

      // Circuit breaker: AI gateway denials/limits halt the whole job, not
      // just this source.
      // Upstream credit/policy denials or repeated rate limits (AI gateway or
      // Firecrawl) halt the whole job rather than burning the batch.
      if (e instanceof AiGatewayError || e instanceof FirecrawlError) {
        if (e.status === 401 || e.status === 402 || e.status === 403) {
          breaker = { kind: "credits", reason: msg };
        } else if (e.status === 429) {
          rateLimitHits++;
          if (rateLimitHits >= 2) breaker = { kind: "rate_limit", reason: msg };
        }
      }
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

    if (breaker) {
      console.error(
        `[scrape] circuit breaker tripped (${breaker.kind}) — halting run`,
      );
      break;
    }
  }

  // Park the job (checked by every entry point) or clear a pause that a
  // successful probe just proved recovered.
  if (breaker) {
    await supabase.rpc("job_pause", {
      _job: JOB_NAME,
      _kind: breaker.kind,
      _reason: breaker.reason,
    });
  } else if (opts.isProbe && processed > 0) {
    console.log("[scrape] probe succeeded — clearing paused state");
    await supabase.rpc("job_resume", { _job: JOB_NAME });
  }

  const status = breaker
    ? "failed"
    : errors.length === 0
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

