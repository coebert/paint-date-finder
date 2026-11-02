// Source-evidence checks shared by the event finder (scrape-venue-events),
// the re-check job (reverify-events) and the admin screens (via src/lib/evidence.ts).
//
// Pure TypeScript, no Deno/Node imports, so it is unit-tested with Vitest.
//
// Rule: an AI suggestion is only a pointer. A candidate is kept only when a
// verbatim excerpt from the fetched page (a) really appears in that page and
// (b) itself states the candidate's exact day, month AND year, and (c) names
// the event (title words or event-type words) — and, for multi-venue sources,
// the venue. Times, prices, booking links and descriptions are kept only when
// the source itself states them; otherwise they stay blank.

export type EventTypeKey =
  | "walk_on" | "big_game" | "competition" | "tournament"
  | "speedball" | "scenario" | "mag_fed" | "other";

export const EVENT_TYPES: readonly EventTypeKey[] = [
  "walk_on", "big_game", "competition", "tournament", "speedball", "scenario", "mag_fed", "other",
];

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const ORD = "(?:st|nd|rd|th)?";

/** Lower-case, unify quotes/dashes/whitespace so copy-paste drift doesn't matter. */
export function normalizeText(s: string): string {
  return (s ?? "")
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u00A0/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isRealIsoDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toIso(y: number, mo: number, d: number): string | null {
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isRealIsoDate(iso) ? iso : null;
}

/**
 * Every date in `text` that states day, month AND a four-digit year.
 * "Sunday 8th November" (no year), "next Saturday", "every Sunday" give nothing.
 * Numeric dates are read the UK way (DD/MM/YYYY).
 */
export function extractExplicitDates(text: string): string[] {
  const t = normalizeText(text);
  const out = new Set<string>();
  const add = (y: number, mo: number, d: number) => {
    const iso = toIso(y, mo, d);
    if (iso) out.add(iso);
  };
  let m: RegExpExecArray | null;

  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = iso.exec(t))) add(+m[1], +m[2], +m[3]);

  const compact = /\b(20\d{2})(\d{2})(\d{2})\b/g; // ICS DTSTART:20261108
  while ((m = compact.exec(t))) add(+m[1], +m[2], +m[3]);

  const uk = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g;
  while ((m = uk.exec(t))) add(+m[3], +m[2], +m[1]);
  const ukDash = /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g;
  while ((m = ukDash.exec(t))) add(+m[3], +m[2], +m[1]);

  // "10-11 october 2026", "10th & 11th oct 2026", "10 to 11 october, 2026"
  const range = new RegExp(
    `\\b(\\d{1,2})${ORD}\\s*(?:-|&|and|to)\\s*(\\d{1,2})${ORD}\\s+(?:of\\s+)?${MONTH_RE}\\.?,?\\s+(\\d{4})\\b`, "g");
  while ((m = range.exec(t))) {
    const mo = MONTHS[m[3]];
    const a = +m[1], b = +m[2], y = +m[4];
    if (mo && b >= a && b - a <= 6) for (let d = a; d <= b; d++) add(y, mo, d);
  }

  const dmy = new RegExp(`\\b(\\d{1,2})${ORD}\\s+(?:of\\s+)?${MONTH_RE}\\.?,?\\s+(\\d{4})\\b`, "g");
  while ((m = dmy.exec(t))) {
    const mo = MONTHS[m[2]];
    if (mo) add(+m[3], mo, +m[1]);
  }

  const mdy = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})${ORD},?\\s+(\\d{4})\\b`, "g");
  while ((m = mdy.exec(t))) {
    const mo = MONTHS[m[1]];
    if (mo) add(+m[3], mo, +m[2]);
  }
  return [...out].sort();
}

/** Page looks like a login wall, bot challenge or empty shell — treat as unavailable. */
export function detectUnavailable(text: string): string | null {
  const t = normalizeText(text);
  if (t.length < 200) return "page_empty";
  const walls: Array<[RegExp, string]> = [
    [/just a moment\.\.\.|checking your browser|attention required|cf-chl|verify you are human|are you a robot|captcha/, "bot_challenge"],
    [/access denied|403 forbidden|request blocked/, "access_denied"],
    [/log in to continue|log into facebook|you must log in|sign in to continue|login required|please log in to (view|see)/, "login_wall"],
    [/enable javascript (and cookies )?to (continue|run this app)|you need to enable javascript/, "javascript_shell"],
  ];
  // Only treat it as a wall when the page is short — long pages may mention these words.
  for (const [re, reason] of walls) if (re.test(t) && t.length < 3000) return reason;
  return null;
}

const STOP = new Set([
  "the", "and", "with", "for", "from", "at", "day", "days", "event", "events", "paintball",
  "paintballing", "game", "games", "open", "new", "our", "this", "that", "your", "all",
]);
function tokens(s: string): string[] {
  return normalizeText(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

const TYPE_WORDS: Record<EventTypeKey, RegExp> = {
  walk_on: /walk[\s-]?on|walkon|open day|public game/,
  big_game: /big[\s-]?game|mega[\s-]?game/,
  competition: /competition|league|series|cup|championship/,
  tournament: /tournament|league|series|cup|championship|round/,
  speedball: /speedball|airball|xball|x-ball|5[\s-]?man|3[\s-]?man/,
  scenario: /scenario|big[\s-]?game|milsim|operation/,
  mag_fed: /mag[\s-]?fed|magfed/,
  other: /$^/,
};

/** Excerpt names this event: a meaningful title word, or the event-type wording. */
export function excerptNamesEvent(excerpt: string, title: string, type: EventTypeKey): boolean {
  const ex = normalizeText(excerpt);
  const exTokens = new Set(tokens(excerpt));
  if (tokens(title).some((w) => exTokens.has(w))) return true;
  return TYPE_WORDS[type]?.test(ex) ?? false;
}

/** Excerpt names the venue (any distinctive venue word). */
export function excerptNamesVenue(excerpt: string, venue: string): boolean {
  const exTokens = new Set(tokens(excerpt));
  const vt = tokens(venue).filter((w) => !["park", "centre", "center", "ltd", "site", "field"].includes(w));
  return vt.length > 0 && vt.some((w) => exTokens.has(w));
}

/** Two titles describe the same event (exact-identity dedupe, not "similar"). */
export function sameEventIdentity(a: string, b: string): boolean {
  const na = normalizeText(a), nb = normalizeText(b);
  if (na === nb) return true;
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return false;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  return shared / new Set([...ta, ...tb]).size >= 0.6;
}

export function strictHttpUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function timeVariants(hhmm: string): string[] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return [];
  const h = +m[1], min = m[2];
  if (h > 23 || +min > 59) return [];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ap = h < 12 ? "am" : "pm";
  const v = [`${String(h).padStart(2, "0")}:${min}`, `${h}:${min}`, `${h}.${min}`, `${h12}:${min}${ap}`, `${h12}:${min} ${ap}`, `${h12}.${min}${ap}`];
  if (min === "00") v.push(`${h12}${ap}`, `${h12} ${ap}`, `${String(h).padStart(2, "0")}00`);
  return v;
}

/** HH:MM kept only if the excerpt states that time. */
export function timeStatedIn(excerpt: string, hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const ex = normalizeText(excerpt);
  const ok = timeVariants(hhmm.trim()).some((v) => ex.includes(v));
  return ok ? hhmm.trim().slice(0, 5).padStart(5, "0") : null;
}

/** Price kept only if every amount in it appears in the excerpt. */
export function priceStatedIn(excerpt: string, price: string | null | undefined): string | null {
  if (!price) return null;
  const ex = normalizeText(excerpt).replace(/\s+/g, "");
  const amounts = normalizeText(price).match(/£?\d+(?:\.\d{2})?/g);
  if (!amounts?.length) return null;
  return amounts.every((a) => ex.includes(a.startsWith("£") ? a : `£${a}`) || ex.includes(a))
    ? price.trim().slice(0, 100)
    : null;
}

const RECURRING = /\bevery\b|\beach (week|month|weekend|sunday|saturday)\b|\bweekly\b|\bmonthly\b|\bfortnightly\b|\b(first|second|third|fourth|last|1st|2nd|3rd|4th) (sun|sat|week)/;
const CANCELLED = /eventcancelled|eventpostponed|\bcancel+ed\b|\bpostponed\b|\bcalled off\b|\brescheduled\b|\bno longer (running|taking place)\b/;
const WRONG_SPORT = /\bairsoft\b|\blaser ?(tag|quest)\b|\bnerf\b|\bgel ?blast/;

export interface CandidateInput {
  title: string;
  event_type: string;
  event_date: string;
  source_quote?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price_info?: string | null;
  booking_url?: string | null;
  description?: string | null;
  venue_name?: string | null;
}

export interface EvidenceContext {
  /** Plain text of the page as fetched (plus any structured lines appended). */
  pageText: string;
  sourceUrl: string;
  /** Venue the candidate is attributed to. */
  venueName: string;
  /** Source covers many venues (group/aggregator) — venue must be in the excerpt. */
  multiVenue: boolean;
  today: string; // YYYY-MM-DD
  maxDate: string; // YYYY-MM-DD
  /** Raw HTML (for booking link presence); optional. */
  rawHtml?: string;
}

export interface EvidenceVerdict {
  ok: boolean;
  reasons: string[];
  warnings: string[];
  kind: "new" | "cancellation";
  quote: string | null;
  datesInQuote: string[];
  cleaned: {
    title: string;
    event_type: EventTypeKey;
    start_time: string | null;
    end_time: string | null;
    price_info: string | null;
    booking_url: string | null;
    description: string | null;
  };
}

export const MIN_QUOTE = 20;
export const MAX_QUOTE = 400;

/** The single server-side gate for automatically discovered candidates. */
export function checkCandidateEvidence(c: CandidateInput, ctx: EvidenceContext): EvidenceVerdict {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const title = (c.title ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  const type = (EVENT_TYPES as readonly string[]).includes(c.event_type) ? (c.event_type as EventTypeKey) : null;
  const quoteRaw = (c.source_quote ?? "").trim().replace(/\s+/g, " ");
  const quote = normalizeText(quoteRaw);
  const page = normalizeText(ctx.pageText);

  if (title.length < 3) reasons.push("missing_title");
  if (!type) reasons.push("invalid_event_type");
  if (!isRealIsoDate(c.event_date)) reasons.push("impossible_date");
  else if (c.event_date < ctx.today) reasons.push("date_in_past");
  else if (c.event_date > ctx.maxDate) reasons.push("date_out_of_range");
  if (!strictHttpUrl(ctx.sourceUrl)) reasons.push("invalid_source_url");

  const unavailable = detectUnavailable(ctx.pageText);
  if (unavailable) reasons.push(`source_unavailable:${unavailable}`);

  let datesInQuote: string[] = [];
  if (!quote) reasons.push("missing_quote");
  else {
    if (quote.length < MIN_QUOTE) reasons.push("quote_too_short");
    if (quote.length > MAX_QUOTE) reasons.push("quote_too_long");
    if (!page.includes(quote)) reasons.push("quote_not_in_source");
    datesInQuote = extractExplicitDates(quoteRaw);
    if (datesInQuote.length === 0) reasons.push("quote_has_no_full_date");
    else if (!datesInQuote.includes(c.event_date)) reasons.push("quote_date_mismatch");
    if (type && !excerptNamesEvent(quoteRaw, title, type)) reasons.push("quote_does_not_name_event");
    if (ctx.multiVenue && !excerptNamesVenue(quoteRaw, ctx.venueName)) reasons.push("quote_does_not_name_venue");
    if (WRONG_SPORT.test(quote) && !/paintball/.test(quote)) reasons.push("wrong_sport");
    if (RECURRING.test(quote)) warnings.push("recurring_wording");
  }
  if (!/paintball/.test(page)) reasons.push("source_not_paintball");

  const kind = quote && CANCELLED.test(quote) ? "cancellation" : "new";

  // Only keep details the source itself states; never fill typical values.
  const start = timeStatedIn(quoteRaw, c.start_time);
  const end = timeStatedIn(quoteRaw, c.end_time);
  if (c.start_time && !start) warnings.push("start_time_not_in_quote_dropped");
  if (c.end_time && !end) warnings.push("end_time_not_in_quote_dropped");
  const price = priceStatedIn(quoteRaw, c.price_info);
  if (c.price_info && !price) warnings.push("price_not_in_quote_dropped");
  let booking = strictHttpUrl(c.booking_url);
  if (booking) {
    const html = ctx.rawHtml ?? ctx.pageText;
    let sameHost = false;
    try { sameHost = new URL(booking).hostname === new URL(ctx.sourceUrl).hostname; } catch { /* */ }
    if (!sameHost && !html.includes(booking.replace(/\/$/, ""))) {
      warnings.push("booking_link_not_on_source_dropped");
      booking = null;
    }
  }
  const descNorm = c.description ? normalizeText(c.description) : "";
  const description = descNorm.length >= 20 && page.includes(descNorm) ? c.description!.trim().slice(0, 2000) : null;
  if (c.description && !description) warnings.push("description_not_verbatim_dropped");

  return {
    ok: reasons.length === 0,
    reasons,
    warnings,
    kind,
    quote: quoteRaw ? quoteRaw.slice(0, MAX_QUOTE) : null,
    datesInQuote,
    cleaned: {
      title,
      event_type: type ?? "other",
      start_time: start,
      end_time: end,
      price_info: price,
      booking_url: booking,
      description,
    },
  };
}

/**
 * Re-check of a stored event against a freshly fetched page.
 * Missing evidence is "needs_evidence", never proof of fiction.
 */
export type RecheckStatus = "source_confirmed" | "needs_evidence" | "stale" | "contradicted" | "unavailable";
export function recheckStoredEvidence(
  ev: { event_date: string; source_quote: string | null },
  pageText: string | null,
): { status: RecheckStatus; note: string } {
  if (!ev.source_quote || normalizeText(ev.source_quote).length < MIN_QUOTE) {
    return { status: "needs_evidence", note: "No usable source excerpt on record" };
  }
  const quoteDates = extractExplicitDates(ev.source_quote);
  if (quoteDates.length > 0 && !quoteDates.includes(ev.event_date)) {
    return { status: "contradicted", note: `Stored excerpt states ${quoteDates.join(", ")}, not ${ev.event_date}` };
  }
  if (pageText === null) return { status: "unavailable", note: "Source page could not be fetched" };
  const wall = detectUnavailable(pageText);
  if (wall) return { status: "unavailable", note: `Source page unavailable (${wall})` };
  if (!normalizeText(pageText).includes(normalizeText(ev.source_quote))) {
    return { status: "stale", note: "Stored excerpt no longer appears on the source page" };
  }
  if (quoteDates.length === 0) {
    return { status: "needs_evidence", note: "Excerpt is on the page but does not state the full date" };
  }
  return { status: "source_confirmed", note: "Excerpt with exact date found on source page" };
}

/** Structured Event data (schema.org JSON-LD) found in raw HTML, as quotable lines. */
export function jsonLdEventLines(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const visit = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(visit);
    const o = n as Record<string, unknown>;
    if (o["@graph"]) visit(o["@graph"]);
    const t = o["@type"];
    const isEvent = (typeof t === "string" && /Event$/.test(t)) || (Array.isArray(t) && t.some((x) => /Event$/.test(String(x))));
    if (isEvent && typeof o.name === "string" && typeof o.startDate === "string") {
      const loc = o.location as Record<string, unknown> | undefined;
      const locName = typeof loc?.name === "string" ? loc.name : "";
      const status = typeof o.eventStatus === "string" ? o.eventStatus.replace(/^.*\//, "") : "";
      out.push(
        `Structured event: ${o.name} | date ${o.startDate.slice(0, 10)}` +
          (locName ? ` | location ${locName}` : "") + (status ? ` | status ${status}` : ""),
      );
    }
  };
  while ((m = re.exec(html))) {
    try { visit(JSON.parse(m[1].trim())); } catch { /* ignore bad JSON-LD */ }
  }
  return out.slice(0, 200);
}

/** VEVENTs from an ICS feed as quotable lines. Recurrence rules are NOT expanded. */
export function icsEventLines(ics: string): string[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const out: string[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (k: string) => new RegExp(`^${k}(?:;[^:]*)?:(.*)$`, "m").exec(body)?.[1]?.trim() ?? "";
    const summary = get("SUMMARY").replace(/\\,/g, ",").replace(/\\n/g, " ");
    const dt = get("DTSTART");
    const dm = /^(\d{4})(\d{2})(\d{2})/.exec(dt);
    if (!summary || !dm) continue;
    const loc = get("LOCATION").replace(/\\,/g, ",");
    const status = get("STATUS");
    const rrule = get("RRULE");
    out.push(
      `Calendar entry: ${summary} | date ${dm[1]}-${dm[2]}-${dm[3]}` +
        (loc ? ` | location ${loc}` : "") + (status ? ` | status ${status}` : "") +
        (rrule ? " | repeats (later dates not confirmed)" : ""),
    );
  }
  return out.slice(0, 500);
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
