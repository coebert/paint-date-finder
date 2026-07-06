// One-click backfill: scan all existing events and merge duplicates using
// the same fuzzy rules as the ingest pipeline (venue + date ±2d + title sim).
import { adminClient, authorizeAdminOrCron, readEnv } from "../_shared/supabase.ts";
import { errors, json, preflight } from "../_shared/http.ts";

interface EventRow {
  id: string;
  title: string;
  venue_name: string;
  event_date: string;
  description: string | null;
  booking_url: string | null;
  price_info: string | null;
  image_url: string | null;
  venue_location: string | null;
  source_url: string | null;
  source_quote: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const env = readEnv();
    if (!env) return errors.missingEnv();

    const auth = await authorizeAdminOrCron(req, env);
    if (!auth.ok) return auth.response;

    const admin = adminClient(env);

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dryRun === true;

    // Load all events ordered oldest-first; older events become canonical.
    const { data: events, error: eventsErr } = await admin
      .from("events")
      .select(
        "id,title,venue_name,event_date,description,booking_url,price_info,image_url,venue_location,source_url,source_quote,created_at"
      )
      .order("created_at", { ascending: true })
      .limit(10000);

    if (eventsErr) return json({ error: eventsErr.message }, { status: 500 });

    const rows = (events ?? []) as EventRow[];
    const removed = new Set<string>();
    const merges: Array<{ canonical: string; duplicate: string }> = [];
    let scanned = 0;

    // Walk newest-first so we collapse newcomers into older canonicals.
    for (let i = rows.length - 1; i >= 0; i--) {
      const ev = rows[i];
      if (removed.has(ev.id)) continue;
      scanned++;

      const { data: dupId, error: dupErr } = await admin.rpc(
        "find_duplicate_event_excluding",
        {
          _id: ev.id,
          _venue: ev.venue_name,
          _date: ev.event_date,
          _title: ev.title,
        },
      );
      if (dupErr) continue;
      const canonicalId = dupId as string | null;
      if (!canonicalId || canonicalId === ev.id || removed.has(canonicalId)) continue;

      merges.push({ canonical: canonicalId, duplicate: ev.id });

      if (!dryRun) {
        await admin.rpc("merge_event_source", {
          _event_id: canonicalId,
          _source: {
            source_url: ev.source_url,
            source_quote: ev.source_quote,
            description: ev.description,
            booking_url: ev.booking_url,
            price_info: ev.price_info,
            image_url: ev.image_url,
            venue_location: ev.venue_location,
            scraped_by: "dedupe-backfill",
            original_event_id: ev.id,
            original_title: ev.title,
            original_venue: ev.venue_name,
            original_event_date: ev.event_date,
          },
        });

        const { error: delErr } = await admin
          .from("events")
          .delete()
          .eq("id", ev.id);
        if (!delErr) removed.add(ev.id);
      } else {
        removed.add(ev.id);
      }
    }

    return json({
      ok: true,
      dryRun,
      scanned,
      duplicatesFound: merges.length,
      merged: dryRun ? 0 : merges.length,
      sample: merges.slice(0, 20),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});
