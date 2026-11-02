# Project rules

- Public-insert tables (event_submissions, event_recaps) are written without reading the row back and with a client-generated id — visitors may insert but not read them, and the reused id makes retries idempotent.
- Public event submissions go through `buildSubmissionPayload` before insert — it is the single gate for valid dates, times, event types and http(s) links.
- Flyer files are uploaded only through the `upload-flyer` function (signed-in, type sniffed, size-capped, per-user `uploads/<uid>/` prefix); storage write policies on flyer-images stay admin-only so visitors can never overwrite, delete or list files.
- `useEvents({ regionVenues })`: undefined means unfiltered, [] means no matching venues (empty result) — never pass undefined to mean "no local venues".
- Auth state callbacks stay synchronous; any Supabase call triggered by sign-in is deferred with setTimeout to avoid auth-client deadlocks.
- Automated event discovery only queues `event_submissions` that pass `supabase/functions/_shared/evidence.ts` (full verbatim excerpt in fetched page + exact day/month/year in that excerpt); it never publishes, merges or overwrites live events — publication goes through the admin-only `approve_submission` RPC, which needs a source link and an explicit date check.
- `events.verification_status` describes source evidence (source_confirmed / human_reviewed / needs_evidence / stale / unavailable / contradicted / quarantined) and `is_verified` means moderator-listed; jobs may change only the former, and removal is via reversible, logged `quarantine_event`, never delete.
- Every public event reader (calendar/detail hooks, OG image, alerts, sitemap) filters out `verification_status = 'quarantined'` explicitly — RLS alone doesn't hide them from signed-in admins browsing the public site.
- 3D (react-three) views render inside `WebGLGuard` so missing/lost WebGL shows a fallback instead of blanking the app.
