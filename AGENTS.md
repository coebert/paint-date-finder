# Project rules

- Public-insert tables (event_submissions, event_recaps) are written without reading the row back and with a client-generated id — visitors may insert but not read them, and the reused id makes retries idempotent.
- Public event submissions go through `buildSubmissionPayload` before insert — it is the single gate for valid dates, times, event types and http(s) links.
