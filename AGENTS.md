# Project rules

- Public-insert tables (event_submissions, event_recaps) are written without reading the row back and with a client-generated id — visitors may insert but not read them, and the reused id makes retries idempotent.
- Public event submissions go through `buildSubmissionPayload` before insert — it is the single gate for valid dates, times, event types and http(s) links.
- Flyer files are uploaded only through the `upload-flyer` function (signed-in, type sniffed, size-capped, per-user `uploads/<uid>/` prefix); storage write policies on flyer-images stay admin-only so visitors can never overwrite, delete or list files.
