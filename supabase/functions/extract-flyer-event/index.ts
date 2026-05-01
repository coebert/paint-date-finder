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

function shouldUseFirecrawlFirst(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return FIRECRAWL_HOST_PATTERNS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30_000);
}

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

  try {
    let candidates: Candidate[] = [];

    if (body.kind === "image") {
      if (!body.data) throw new Error("image data is required");
      // Accept either a data URL or a public https URL — Gemini handles both.
      const url = body.data;
      candidates = await extractFromImage(LOVABLE_API_KEY, url, body.sourceUrl);
    } else if (body.kind === "pdf") {
      if (!body.data) throw new Error("pdf data is required");
      // Gemini accepts PDFs as image_url with a data URL when the mime is application/pdf.
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
      candidates = await callGemini(LOVABLE_API_KEY, messages);
    } else if (body.kind === "text") {
      if (!body.text || body.text.trim().length < 10) {
        throw new Error("text must be at least 10 characters");
      }
      candidates = await extractFromText(
        LOVABLE_API_KEY,
        body.text,
        body.sourceUrl,
      );
    } else if (body.kind === "url") {
      const url = (body.sourceUrl || body.text || "").trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new Error("a valid http(s) URL is required");
      }
      let text: string;
      if (FIRECRAWL_API_KEY && shouldUseFirecrawlFirst(url)) {
        text = await fetchViaFirecrawl(url, FIRECRAWL_API_KEY);
      } else {
        text = await fetchPageText(url);
        if (text.length < 300 && FIRECRAWL_API_KEY) {
          text = await fetchViaFirecrawl(url, FIRECRAWL_API_KEY);
        }
      }
      if (text.length < 30) {
        throw new Error(
          "Couldn't read enough content from that URL — many Facebook posts require login. Try uploading a screenshot instead.",
        );
      }
      candidates = await extractFromText(LOVABLE_API_KEY, text, url);
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

    console.log(
      `[flyer] extracted=${candidates.length} kept=${cleaned.length}`,
    );

    return new Response(
      JSON.stringify({ candidates: cleaned, total_extracted: candidates.length }),
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
