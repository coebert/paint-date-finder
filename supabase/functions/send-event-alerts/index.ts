// Scheduled: push a notification to iPhones near each newly verified upcoming event.
// Each event is alerted at most once (event_alerts_sent).
import { importPKCS8, SignJWT } from "https://esm.sh/jose@5.9.6";
import { json, errors, preflight } from "../_shared/http.ts";
import { readEnv, adminClient, authorizeAdminOrCron } from "../_shared/supabase.ts";

const MAX_EVENTS_PER_RUN = 20;

function milesBetween(a: [number, number], b: [number, number]) {
  const R = 3958.8, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const ukDate = (iso: string) => iso.split("-").reverse().join("/");

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const env = readEnv();
  if (!env) return errors.missingEnv();
  const auth = await authorizeAdminOrCron(req, env);
  if (!auth.ok) return auth.response;

  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const p8 = Deno.env.get("APNS_PRIVATE_KEY");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  if (!keyId || !teamId || !p8 || !bundleId) return json({ ok: false, reason: "Apple notifications key not configured" });
  const host = Deno.env.get("APNS_ENV") === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";

  const db = adminClient(env);
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 3 * 86400_000).toISOString();

  const { data: events } = await db.from("events")
    .select("id,title,venue_name,event_date,updated_at")
    .eq("is_verified", true).neq("verification_status", "quarantined").gte("event_date", today).gte("updated_at", since)
    .order("updated_at", { ascending: true }).limit(200);
  if (!events?.length) return json({ ok: true, sent: 0 });

  const { data: done } = await db.from("event_alerts_sent").select("event_id").in("event_id", events.map((e) => e.id));
  const doneIds = new Set((done ?? []).map((d) => d.event_id));
  const pending = events.filter((e) => !doneIds.has(e.id)).slice(0, MAX_EVENTS_PER_RUN);
  if (!pending.length) return json({ ok: true, sent: 0 });

  const [{ data: venues }, { data: devices }] = await Promise.all([
    db.from("venues").select("name,latitude,longitude"),
    db.from("alert_devices").select("token,latitude,longitude,radius_miles,walk_ons,cpps"),
  ]);
  const venueByName = new Map((venues ?? []).filter((v) => v.latitude != null).map((v) => [v.name.toLowerCase().trim(), v]));

  const jwt = await new SignJWT({ iss: teamId, iat: Math.floor(Date.now() / 1000) })
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .sign(await importPKCS8(p8.replace(/\\n/g, "\n"), "ES256"));

  let sent = 0;
  let failedEvents = 0;
  const deadTokens: string[] = [];
  for (const ev of pending) {
    const isCpps = /cpps/i.test(ev.title) || /cpps/i.test(ev.venue_name);
    const v = venueByName.get(ev.venue_name.toLowerCase().trim());
    const targets = (devices ?? []).filter((d) => {
      if (isCpps) return d.cpps; // CPPS rounds go to everyone who opted in, wherever they are
      if (!d.walk_ons) return false;
      if (!v || d.latitude == null || d.longitude == null) return false;
      return milesBetween([d.latitude, d.longitude], [v.latitude!, v.longitude!]) <= d.radius_miles;
    });
    const body = {
      aps: {
        alert: { title: isCpps ? "New CPPS round date" : "New walk-on near you", body: `${ev.title} · ${ev.venue_name} · ${ukDate(ev.event_date)}` },
        sound: "default",
      },
      eventId: ev.id,
    };
    let delivered = 0;
    let transientFailures = 0;
    for (const d of targets) {
      const r = await pushOnce(host, jwt, bundleId, d.token, body);
      if (r === "ok") { delivered++; sent++; }
      else if (r === "dead") deadTokens.push(d.token);
      else if (r === "transient") transientFailures++;
    }
    // Mark the event done only when something was delivered, nobody was targeted,
    // or every failure was permanent. If Apple was unreachable for everyone, leave
    // it for the next hourly run instead of silently dropping the alert.
    if (delivered > 0 || transientFailures === 0) {
      await db.from("event_alerts_sent").insert({ event_id: ev.id, recipients: delivered });
    } else {
      failedEvents++;
    }
  }
  if (deadTokens.length) await db.from("alert_devices").delete().in("token", deadTokens);
  return json({ ok: true, events: pending.length, sent, removed: deadTokens.length, retry_later: failedEvents });
});

/** Reasons Apple uses when a token will never work again. */
const PERMANENT_REASONS = new Set(["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic", "ExpiredToken"]);

/** Send one push with up to 2 retries on 429/5xx/network errors. */
async function pushOnce(host: string, jwt: string, topic: string, token: string, body: unknown): Promise<"ok" | "dead" | "transient" | "failed"> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://${host}/3/device/${token}`, {
        method: "POST",
        headers: { authorization: `bearer ${jwt}`, "apns-topic": topic, "apns-push-type": "alert", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { await res.body?.cancel(); return "ok"; }
      let reason = "";
      try { reason = (await res.json())?.reason ?? ""; } catch { /* no body */ }
      if (res.status === 410 || PERMANENT_REASONS.has(reason)) return "dead";
      if (res.status !== 429 && res.status < 500) {
        console.error(`[alerts] APNs ${res.status} ${reason}`);
        return "failed";
      }
    } catch (e) {
      console.error("[alerts] APNs network error", e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  return "transient";
}
