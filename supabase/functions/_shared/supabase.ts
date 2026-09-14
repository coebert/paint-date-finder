// Shared Supabase client factories and admin-authorization helper.
// Consolidates the ~40-line auth block previously copy-pasted into every
// edge function that needs "cron-or-admin" access control.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { errors } from "./http.ts";

export interface SharedEnv {
  supabaseUrl: string;
  serviceKey: string;
  anonKey: string;
}

/**
 * Read the standard Supabase env vars an edge function needs.
 * Returns null if any are missing so the caller can respond 500.
 */
export function readEnv(): SharedEnv | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    "";
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey, anonKey };
}

/** Admin/service-role client (bypasses RLS). Use only server-side. */
export function adminClient(env: SharedEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceKey);
}

/** Per-request user-scoped client. RLS applies. */
export function userClient(env: SharedEnv, authHeader: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.anonKey || env.serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

export type AuthResult =
  | { ok: true; triggeredBy: string; userId: string | null }
  | { ok: false; response: Response };

/**
 * Authorize a request as either a cron caller (service-role bearer or
 * matching x-cron-secret) or an authenticated admin user.
 *
 * @param opts.cronSecretEnv — optional env var name for a dedicated cron
 *   secret; if set and header matches, request is admitted as cron.
 *   Defaults to SCRAPE_CRON_SECRET when unset.
 *
 * Note: the public anon/publishable key is NEVER accepted as authorization.
 * Cron callers must present either the service-role key or the shared
 * x-cron-secret header.
 */
export async function authorizeAdminOrCron(
  req: Request,
  env: SharedEnv,
  opts: { cronSecretEnv?: string } = {},
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

  // Cron paths. Either shared scheduler secret is accepted: CRON_SECRET is
  // wired into the pg_cron schedules, SCRAPE_CRON_SECRET into manual callers.
  const cronSecretEnvNames = opts.cronSecretEnv
    ? [opts.cronSecretEnv]
    : ["SCRAPE_CRON_SECRET", "CRON_SECRET"];
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const isCronBySecret = !!cronHeader &&
    cronSecretEnvNames.some((name) => {
      const secret = Deno.env.get(name) ?? "";
      return !!secret && secret === cronHeader;
    });
  const isCronByBearer = !!bearer && bearer === env.serviceKey;
  if (isCronBySecret || isCronByBearer) {
    return { ok: true, triggeredBy: "cron", userId: null };
  }

  // User path: needs a bearer + admin role.
  if (!bearer || !authHeader) {
    return { ok: false, response: errors.unauthorized() };
  }
  try {
    const client = userClient(env, authHeader);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, response: errors.unauthorized() };

    const { data: isAdmin, error } = await client.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (error || !isAdmin) return { ok: false, response: errors.forbidden() };

    return { ok: true, triggeredBy: `admin:${user.id}`, userId: user.id };
  } catch {
    return { ok: false, response: errors.unauthorized() };
  }
}
