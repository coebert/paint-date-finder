// Shared CORS + JSON response helpers for all edge functions.
// Underscore-prefixed folders under supabase/functions are not deployed as
// their own function; they can be imported by sibling functions via relative
// paths (e.g. `import { json } from "../_shared/http.ts"`).

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export const errors = {
  missingEnv: () => json({ error: "Missing required environment variables" }, { status: 500 }),
  unauthorized: () => json({ error: "Unauthorized" }, { status: 401 }),
  forbidden: () => json({ error: "Forbidden" }, { status: 403 }),
};
