// Public: an iPhone registers (or updates / removes) its push token and alert preferences.
// Stored server-side only; the table has no client access.
import { z } from "https://esm.sh/zod@3.23.8";
import { preflight, json, errors } from "../_shared/http.ts";
import { readEnv, adminClient } from "../_shared/supabase.ts";

const Body = z.object({
  token: z.string().regex(/^[0-9a-fA-F]{32,200}$/),
  enabled: z.boolean(),
  latitude: z.number().min(49).max(61).nullable().optional(),
  longitude: z.number().min(-9).max(3).nullable().optional(),
  radius_miles: z.number().int().min(5).max(500).optional(),
  walk_ons: z.boolean().optional(),
  cpps: z.boolean().optional(),
});

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  const env = readEnv();
  if (!env) return errors.missingEnv();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  const db = adminClient(env);

  if (!b.enabled) {
    await db.from("alert_devices").delete().eq("token", b.token);
    return json({ ok: true, enabled: false });
  }
  const { error } = await db.from("alert_devices").upsert({
    token: b.token,
    platform: "ios",
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
    radius_miles: b.radius_miles ?? 50,
    walk_ons: b.walk_ons ?? true,
    cpps: b.cpps ?? true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "token" });
  if (error) return json({ error: "Could not save" }, { status: 500 });
  return json({ ok: true, enabled: true });
});
