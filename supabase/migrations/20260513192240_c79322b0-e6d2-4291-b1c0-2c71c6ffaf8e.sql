-- Tighten EXECUTE permissions on SECURITY DEFINER functions.
-- Default Postgres grants EXECUTE to PUBLIC on every function; revoke that
-- and re-grant only the roles that legitimately need to call each function.

-- Trigger-only: never invoked directly via the API.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Used exclusively inside RLS policies. Anon never hits an admin policy,
-- so it doesn't need EXECUTE; authenticated does.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Admin-only helper (internal admin check raises if caller isn't admin).
REVOKE ALL ON FUNCTION public.get_admin_team_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_team_contacts() TO authenticated;

-- Read-only stats (admin dashboard uses it; not security-sensitive but tighten anyway).
REVOKE ALL ON FUNCTION public.get_visit_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit_stats(integer) TO authenticated;

-- The following functions are *intentionally* callable by anon — they are
-- the public submission / token-delete RPCs for community contributions.
-- We keep anon + authenticated EXECUTE explicit (and revoke PUBLIC noise):
REVOKE ALL ON FUNCTION public.create_field_layout(text, text, text, text[], jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_field_layout(text, text, text, text[], jsonb, integer) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_field_layout(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_field_layout(uuid, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_event_flag(uuid, public.event_flag_reason, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_event_flag(uuid, public.event_flag_reason, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_event_flag(uuid, public.event_flag_reason, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_event_flag(uuid, public.event_flag_reason, text, date) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_event_flag(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_event_flag(uuid, uuid) TO anon, authenticated;