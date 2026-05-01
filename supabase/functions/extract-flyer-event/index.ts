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

/** fetch() with an AbortController-backed timeout. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
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
    "- Keep titles short and human (max ~80 chars). Put extras (brief flavour text, what's included) in description."
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

  // Light auth context — we don't gate on a user, but knowing if there's a
  // logged-in user lets us trace abuse via logs if needed.
  const authHeader = req.headers.get("Authorization");
  let userId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      // ignore
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

    // Filter: valid future date only.
    const today = new Date().toISOString().slice(0, 10);
    const cleaned = candidates.filter((c) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.event_date)) return false;
      if (c.event_date < today) return false;
      return true;
    });

    timings.total = Date.now() - t0;
    console.log(
      `[flyer] extracted=${candidates.length} kept=${cleaned.length} timings=${JSON.stringify(timings)}`,
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
