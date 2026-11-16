// Read-only admin status check.
//
// Previously this function promoted any signed-in account whose email matched
// ADMIN_EMAIL. It no longer writes anything: admin status is read from the
// existing server-managed `user_roles` grant for the caller's verified,
// immutable auth user id. New admins are granted manually by an existing admin
// (user_roles "Admins can manage roles" policy) or by trusted server-side
// administration — never by email match.

import { errors, json, preflight } from "../_shared/http.ts";
import { readEnv, userClient } from "../_shared/supabase.ts";
import { decideAccess } from "./decide.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const env = readEnv();
  if (!env) return errors.missingEnv();

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ") || authHeader.length <= 7) {
    return errors.unauthorized();
  }

  try {
    const client = userClient(env, authHeader);
    const { data, error } = await client.auth.getUser();
    const decision = decideAccess(error ? null : data?.user);
    if (decision.status !== 200) {
      return json(decision.body, { status: decision.status });
    }

    // has_role is SECURITY DEFINER; called with the user's own token so RLS
    // and grants apply. Read-only.
    const { data: isAdmin, error: roleError } = await client.rpc("has_role", {
      _user_id: decision.userId,
      _role: "admin",
    });
    if (roleError) {
      console.error("ensure-admin: role lookup failed", roleError.code);
      return json({ error: "Unable to process request" }, { status: 500 });
    }
    return json({ isAdmin: isAdmin === true });
  } catch (err) {
    console.error("ensure-admin: unexpected error", (err as Error)?.name);
    return json({ error: "Internal server error" }, { status: 500 });
  }
});
