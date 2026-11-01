// Lets a signed-in person permanently delete their own account (App Store requirement).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { preflight, json, errors } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return errors.missingEnv();

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return errors.unauthorized();

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return errors.unauthorized();

  const admin = createClient(url, service);
  for (const table of ["flyer_extraction_log", "user_visits", "user_roles"]) {
    await admin.from(table).delete().eq("user_id", user.id);
  }
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("delete-account failed for", user.id, delErr.message);
    return json({ error: "Could not delete account" }, { status: 500 });
  }
  console.log("account deleted", user.id);
  return json({ ok: true });
});
