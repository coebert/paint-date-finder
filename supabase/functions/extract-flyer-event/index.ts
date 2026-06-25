// Extract candidate paintball events from an uploaded flyer.
// Accepts an image (data URL), PDF (data URL), pasted text, or a URL.
// Uses Gemini 2.5 Flash multimodal via the Lovable AI gateway.
// Returns { candidates: [...] } — the client decides whether to insert
// them into event_submissions (public) or events (admin direct import).
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
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  price_info?: string | null;
  booking_url?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  /** Verbatim quote from the source that mentions the date (grounded extraction). */
  source_quote?: string | null;
};

type EnrichedCandidate = Candidate & {
  venue_match_status: "matched" | "fuzzy" | "unmatched" | "unknown";
  sanity_warnings: string[];
  source_quote_verified: boolean;
};

type RequestBody = {
  kind: "image" | "pdf" | "text" | "url";
  // For image/pdf: a data URL "data:<mime>;base64,..." OR a public https URL.
  data?: string;
  mimeType?: string;
  // For text/url
  text?: string;
  sourceUrl?: string;
};

const FIRECRAWL_HOST_PATTERNS = [
  /(^|\.)facebook\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)eventbrite\.co\.uk$/i,
  /(^|\.)eventbrite\.com$/i,
];

// Hard per-attempt timeouts so the function never hangs.
const FETCH_TIMEOUT_MS = 12_000;
const FIRECRAWL_TIMEOUT_MS = 25_000;
// Treat anything shorter than this (after stripping markup) as "empty".
const MIN_USEFUL_TEXT = 200;

function shouldUseFirecrawlFirst(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return FIRECRAWL_HOST_PATTERNS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

function isFacebook(url: string): boolean {
  try {
    return /(^|\.)facebook\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isInstagram(url: string): boolean {
  try {
    return /(^|\.)instagram\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * SSRF guard. Reject URLs that resolve (or are literally addressed) to
 * loopback, link-local, private, or reserved ranges before any outbound
 * fetch. Hostnames are resolved via DNS so a malicious DNS record cannot
 * smuggle a 127.0.0.1 / 169.254.x / 10.x / metadata.google.internal target.
 */
const PRIVATE_HOST_REGEX =
  /^(localhost|metadata\.google\.internal|metadata|.*\.internal|.*\.local)$/i;

export function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [parseInt(v4[1], 10), parseInt(v4[2], 10)];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  // IPv6: block loopback, link-local, unique-local, mapped private v4
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    return isPrivateIp(mapped);
  }
  return false;
}

async function assertSafeOutboundUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!host) throw new Error("Invalid URL host");
  if (PRIVATE_HOST_REGEX.test(host)) {
    throw new Error("Refusing to fetch internal host");
  }
  // If host is a literal IP, check directly.
  if (/^[0-9.]+$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) throw new Error("Refusing to fetch private IP");
    return;
  }
  // Resolve DNS and ensure no record points to a private range.
  try {
    const [a, aaaa] = await Promise.all([
      Deno.resolveDns(host, "A").catch(() => [] as string[]),
      Deno.resolveDns(host, "AAAA").catch(() => [] as string[]),
    ]);
    const all = [...a, ...aaaa];
    if (all.length === 0) throw new Error("DNS resolution failed");
    for (const ip of all) {
      if (isPrivateIp(ip)) throw new Error("Refusing to fetch private IP");
    }
  } catch (e) {
    throw new Error(
      e instanceof Error && e.message.startsWith("Refusing")
        ? e.message
        : "URL host could not be safely resolved",
    );
  }
}

/** fetch() with an AbortController-backed timeout and SSRF guard. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  await assertSafeOutboundUrl(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // Disable redirects so an open-redirect target on a public host cannot
    // be used to bounce to a private IP without re-validation.
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) {
        const next = new URL(loc, url).toString();
        await assertSafeOutboundUrl(next);
        return await fetch(next, { ...init, signal: ctrl.signal, redirect: "manual" });
      }
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30_000);
}

async function fetchPageText(url: string): Promise<string> {
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FindAWalkOnBot/1.0; +https://findawalkon.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    },
    FETCH_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return stripHtml(await res.text());
}

/** Convert www.facebook.com → m.facebook.com (mobile site exposes more content without login). */
function toMobileFacebook(url: string): string {
  try {
    const u = new URL(url);
    if (/(^|\.)facebook\.com$/i.test(u.hostname)) {
      u.hostname = "m.facebook.com";
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}

/** Try Instagram's public oEmbed for caption text. */
async function fetchInstagramOEmbed(url: string): Promise<string> {
  const oembedUrl =
    "https://www.instagram.com/api/v1/oembed/?url=" + encodeURIComponent(url);
  const res = await fetchWithTimeout(
    oembedUrl,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 FindAWalkOnBot/1.0",
        Accept: "application/json",
      },
    },
    FETCH_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`Instagram oEmbed ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const title = (data?.title ?? "").toString();
  const author = (data?.author_name ?? "").toString();
  return [title, author && `Posted by ${author}`].filter(Boolean).join("\n");
}

/** Try Facebook's plugins/post HTML which often surfaces the post text without login. */
async function fetchFacebookEmbed(url: string): Promise<string> {
  const embedUrl =
    "https://www.facebook.com/plugins/post.php?show_text=true&href=" +
    encodeURIComponent(url);
  const res = await fetchWithTimeout(
    embedUrl,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 FindAWalkOnBot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    },
    FETCH_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`Facebook embed ${res.status}`);
  return stripHtml(await res.text());
}

async function fetchViaFirecrawlOnce(
  url: string,
  apiKey: string,
): Promise<string> {
  const res = await fetchWithTimeout(
    "https://api.firecrawl.dev/v2/scrape",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 2500,
      }),
    },
    FIRECRAWL_TIMEOUT_MS,
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const md: string = data?.data?.markdown ?? data?.markdown ?? "";
  return md.replace(/\s+/g, " ").trim().slice(0, 30_000);
}

/**
 * Firecrawl with one retry + backoff. Returns "" on empty/insufficient content
 * instead of throwing, so the caller can fall back.
 */
async function fetchViaFirecrawl(
  url: string,
  apiKey: string,
): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await fetchViaFirecrawlOnce(url, apiKey);
      if (text.length >= MIN_USEFUL_TEXT) return text;
      console.log(
        `[flyer] firecrawl attempt ${attempt} returned ${text.length} chars (below ${MIN_USEFUL_TEXT})`,
      );
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[flyer] firecrawl attempt ${attempt} failed: ${msg}`);
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 800));
  }
  if (lastErr) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    console.log(`[flyer] firecrawl exhausted retries: ${msg}`);
  }
  return "";
}

/**
 * Resolve a social URL to text via a fallback chain.
 * Each step has its own timeout and never hangs the request.
 * Returns the best non-empty text found, or "" if everything failed.
 */
async function resolveUrlText(
  url: string,
  firecrawlKey: string | undefined,
): Promise<{ text: string; via: string }> {
  const attempts: Array<{ name: string; run: () => Promise<string> }> = [];

  if (firecrawlKey && shouldUseFirecrawlFirst(url)) {
    attempts.push({
      name: "firecrawl",
      run: () => fetchViaFirecrawl(url, firecrawlKey),
    });
  }

  if (isFacebook(url)) {
    attempts.push({ name: "fb-embed", run: () => fetchFacebookEmbed(url) });
    attempts.push({
      name: "fb-mobile",
      run: () => fetchPageText(toMobileFacebook(url)),
    });
  }
  if (isInstagram(url)) {
    attempts.push({ name: "ig-oembed", run: () => fetchInstagramOEmbed(url) });
  }

  // Plain HTTP fetch as a baseline (works for venue sites, often empty for FB).
  attempts.push({ name: "plain", run: () => fetchPageText(url) });

  // Last resort: Firecrawl on non-social sites if we haven't tried it yet.
  if (firecrawlKey && !shouldUseFirecrawlFirst(url)) {
    attempts.push({
      name: "firecrawl-fallback",
      run: () => fetchViaFirecrawl(url, firecrawlKey),
    });
  }

  let best = { text: "", via: "none" };
  for (const a of attempts) {
    try {
      const text = await a.run();
      console.log(`[flyer] url ${a.name} -> ${text.length} chars`);
      if (text.length > best.text.length) best = { text, via: a.name };
      if (text.length >= MIN_USEFUL_TEXT) return best;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[flyer] url ${a.name} failed: ${msg}`);
    }
  }
  return best;
}

function buildExtractionTool() {
  return {
    type: "function" as const,
    function: {
      name: "submit_candidates",
      description:
        "Return every distinct upcoming UK paintball event found, one entry per dated event.",
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
                venue_name: { type: "string" },
                venue_location: { type: "string" },
                source_quote: {
                  type: "string",
                  description:
                    "Verbatim text snippet (max 240 chars) from the source that mentions this event's date. " +
                    "For images, transcribe the exact words from the flyer. For text/URL sources, copy a real substring.",
                },
              },
              required: ["title", "event_type", "event_date", "source_quote"],
              additionalProperties: false,
            },
          },
        },
        required: ["candidates"],
        additionalProperties: false,
      },
    },
  };
}

async function callGemini(
  apiKey: string,
  messages: unknown[],
  model = "google/gemini-2.5-flash",
): Promise<Candidate[]> {
  const body = {
    model,
    messages,
    tools: [buildExtractionTool()],
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
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
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

function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return (
    "You extract upcoming UK paintball events from flyers, social posts, " +
    "and venue text. Today's date is " + today + ". " +
    "Rules:\n" +
    "- Only return events with an unambiguous, explicitly stated date.\n" +
    "- Never guess or infer dates from context. If no concrete date is shown, return [].\n" +
    "- Use ISO YYYY-MM-DD for dates and HH:MM (24h) for times.\n" +
    "- If the flyer lists multiple dates (e.g. a month of walk-ons), return one candidate per date.\n" +
    "- event_type guidance: walk_on (open pay-and-play), big_game (themed/scenario big day), " +
    "competition/tournament (ranked play), speedball (airball/sup'air), scenario (milsim/woodland themed), " +
    "mag_fed (magazine-fed only), other (anything else).\n" +
    "- Prefer dates today or in the future; ignore clearly past dates.\n" +
    "- Keep titles short and human (max ~80 chars). Put extras (brief flavour text, what's included) in description.\n" +
    "- GROUNDING (critical): for every event, set source_quote to a verbatim excerpt from the source that explicitly contains the date — do NOT paraphrase. " +
    "If you cannot find a verbatim mention of the date, do not return that event. This prevents hallucinated dates."
  );
}

async function extractFromImage(
  apiKey: string,
  dataUrl: string,
  sourceUrl: string | undefined,
): Promise<Candidate[]> {
  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "Extract every dated upcoming paintball event from this flyer image. " +
            (sourceUrl ? `Source: ${sourceUrl}\n` : "") +
            "Return strict JSON via the tool call.",
        },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ];
  return callGemini(apiKey, messages);
}

async function extractFromText(
  apiKey: string,
  text: string,
  sourceUrl: string | undefined,
): Promise<Candidate[]> {
  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content:
        (sourceUrl ? `Source URL: ${sourceUrl}\n\n` : "") +
        "Extract every dated upcoming paintball event from this text. Return strict JSON via the tool call.\n\n" +
        "--- TEXT ---\n" +
        text.slice(0, 30_000),
    },
  ];
  return callGemini(apiKey, messages);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Open to both public submitters (SubmitEventDialog) and admins (AdminFlyerImportCard).
  // Best-effort identify the caller for logging; do not block anonymous callers.
  const authHeader = req.headers.get("Authorization");
  let userId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await supabase.auth.getUser();
      userId = userData.user?.id ?? null;
    } catch {
      userId = null;
    }
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body?.kind) {
    return new Response(JSON.stringify({ error: "kind is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(
    `[flyer] kind=${body.kind} user=${userId ?? "anon"} src=${body.sourceUrl ?? "-"}`,
  );

  // Per-stage timings, returned to the client to refine its ETA model.
  const t0 = Date.now();
  const timings: Record<string, number> = {};
  const time = async <T>(stage: string, fn: () => Promise<T>): Promise<T> => {
    const s = Date.now();
    try {
      return await fn();
    } finally {
      timings[stage] = Date.now() - s;
    }
  };

  try {
    let candidates: Candidate[] = [];
    let resolvedVia: string | undefined;
    /** The verbatim source text we can verify quotes against (text/url only). */
    let sourceText: string | null = null;

    if (body.kind === "image") {
      if (!body.data) throw new Error("image data is required");
      const url = body.data;
      candidates = await time("gemini", () =>
        extractFromImage(LOVABLE_API_KEY, url, body.sourceUrl));
    } else if (body.kind === "pdf") {
      if (!body.data) throw new Error("pdf data is required");
      const messages = [
        { role: "system", content: systemPrompt() },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract every dated upcoming paintball event from this PDF flyer. " +
                (body.sourceUrl ? `Source: ${body.sourceUrl}\n` : "") +
                "Return strict JSON via the tool call.",
            },
            { type: "image_url", image_url: { url: body.data } },
          ],
        },
      ];
      candidates = await time("gemini", () =>
        callGemini(LOVABLE_API_KEY, messages));
    } else if (body.kind === "text") {
      if (!body.text || body.text.trim().length < 10) {
        throw new Error("text must be at least 10 characters");
      }
      sourceText = body.text;
      candidates = await time("gemini", () =>
        extractFromText(LOVABLE_API_KEY, body.text!, body.sourceUrl));
    } else if (body.kind === "url") {
      const url = (body.sourceUrl || body.text || "").trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new Error("a valid http(s) URL is required");
      }
      const { text, via } = await time("scrape", () =>
        resolveUrlText(url, FIRECRAWL_API_KEY));
      resolvedVia = via;
      sourceText = text;
      console.log(`[flyer] url resolved via=${via} chars=${text.length}`);
      if (text.length < 30) {
        const social = isFacebook(url) || isInstagram(url);
        throw new Error(
          social
            ? "Couldn't read this Facebook/Instagram post — it likely requires login or has been removed. Open the post, take a screenshot, and use the Image tab instead."
            : "Couldn't read enough content from that URL. Try the Text tab and paste the post directly, or use a screenshot.",
        );
      }
      candidates = await time("gemini", () =>
        extractFromText(LOVABLE_API_KEY, text, url));
    } else {
      throw new Error(`unsupported kind: ${body.kind}`);
    }

    // ---- Load known venues for fuzzy matching ----
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: venueRows } = await supabaseAdmin
      .from("venues")
      .select("name");
    const knownVenues: string[] = (venueRows ?? []).map((r: { name: string }) =>
      r.name,
    );

    // ---- Sanity guards + grounded verification + venue matching ----
    const today = new Date().toISOString().slice(0, 10);
    const maxDate = new Date();
    maxDate.setUTCMonth(maxDate.getUTCMonth() + 18);
    const maxDateIso = maxDate.toISOString().slice(0, 10);

    const cleaned: EnrichedCandidate[] = [];
    let droppedReason: Record<string, number> = {};

    for (const c of candidates) {
      const warnings: string[] = [];

      // Hard guards — drop the candidate
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.event_date)) {
        droppedReason["bad_date_format"] = (droppedReason["bad_date_format"] ?? 0) + 1;
        continue;
      }
      if (c.event_date < today) {
        droppedReason["past_date"] = (droppedReason["past_date"] ?? 0) + 1;
        continue;
      }
      if (c.event_date > maxDateIso) {
        droppedReason["too_far_future"] = (droppedReason["too_far_future"] ?? 0) + 1;
        continue;
      }
      const title = (c.title ?? "").trim();
      if (title.length < 3) {
        droppedReason["title_too_short"] = (droppedReason["title_too_short"] ?? 0) + 1;
        continue;
      }
      if (title.length > 200) c.title = title.slice(0, 200);

      // Soft warnings
      if (!c.source_quote || c.source_quote.trim().length < 4) {
        warnings.push("missing_source_quote");
      }
      if (!c.venue_name || c.venue_name.trim().length < 2) {
        warnings.push("missing_venue");
      }

      // Grounded verification: only meaningful when we have source text
      let quoteVerified = false;
      if (sourceText && c.source_quote) {
        const normalize = (s: string) =>
          s.toLowerCase().replace(/\s+/g, " ").trim();
        const haystack = normalize(sourceText);
        const needle = normalize(c.source_quote).slice(0, 200);
        if (needle.length >= 6 && haystack.includes(needle)) {
          quoteVerified = true;
        } else {
          // Try a looser check: at least 4 consecutive significant words.
          const words = needle.split(" ").filter((w) => w.length > 2);
          if (words.length >= 4) {
            const chunk = words.slice(0, 4).join(" ");
            if (haystack.includes(chunk)) quoteVerified = true;
          }
          if (!quoteVerified) warnings.push("quote_not_in_source");
        }
      }

      // Venue matching
      let venueStatus: EnrichedCandidate["venue_match_status"] = "unknown";
      if (c.venue_name && knownVenues.length > 0) {
        const norm = (s: string) =>
          s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
        const cn = norm(c.venue_name);
        let bestScore = 0;
        for (const v of knownVenues) {
          const vn = norm(v);
          if (vn === cn) {
            bestScore = 1;
            break;
          }
          // token jaccard
          const a = new Set(cn.split(" ").filter(Boolean));
          const b = new Set(vn.split(" ").filter(Boolean));
          let inter = 0;
          for (const t of a) if (b.has(t)) inter++;
          const union = a.size + b.size - inter;
          const s = union === 0 ? 0 : inter / union;
          if (s > bestScore) bestScore = s;
        }
        if (bestScore >= 0.95) venueStatus = "matched";
        else if (bestScore >= 0.5) venueStatus = "fuzzy";
        else {
          venueStatus = "unmatched";
          warnings.push("unknown_venue");
        }
      }

      cleaned.push({
        ...c,
        venue_match_status: venueStatus,
        sanity_warnings: warnings,
        source_quote_verified: quoteVerified,
      });
    }

    timings.total = Date.now() - t0;
    console.log(
      `[flyer] extracted=${candidates.length} kept=${cleaned.length} dropped=${JSON.stringify(droppedReason)} timings=${JSON.stringify(timings)}`,
    );

    return new Response(
      JSON.stringify({
        candidates: cleaned,
        total_extracted: candidates.length,
        timings,
        resolved_via: resolvedVia,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[flyer] ERROR ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
