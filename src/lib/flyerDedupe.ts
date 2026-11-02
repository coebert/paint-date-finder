import { supabase } from '@/integrations/supabase/client';
import type { ExtractedCandidate } from '@/lib/flyerExtraction';

/** Normalise a string for fuzzy matching: lowercase, strip punctuation, collapse spaces. */
function normalise(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token-set Jaccard similarity (0..1). Cheap and good enough for short titles. */
function fuzzyTitleScore(a: string, b: string): number {
  const aT = new Set(normalise(a).split(' ').filter(Boolean));
  const bT = new Set(normalise(b).split(' ').filter(Boolean));
  if (aT.size === 0 || bT.size === 0) return 0;
  let inter = 0;
  for (const t of aT) if (bT.has(t)) inter += 1;
  const union = aT.size + bT.size - inter;
  return inter / union;
}

const FUZZY_THRESHOLD = 0.7;

export type DedupeScope = 'events' | 'event_submissions' | 'both';

export type DedupeResult<T> = {
  unique: T[];
  duplicates: Array<{ candidate: T; matchedIn: 'events' | 'event_submissions'; reason: string }>;
};

type ExistingRow = {
  title: string;
  venue_name: string | null;
  event_date: string;
  event_type: string;
};

async function fetchExisting(
  dates: string[],
  scope: DedupeScope,
): Promise<{ events: ExistingRow[]; submissions: ExistingRow[] }> {
  const result = { events: [] as ExistingRow[], submissions: [] as ExistingRow[] };
  if (dates.length === 0) return result;

  if (scope === 'events' || scope === 'both') {
    const { data, error } = await supabase
      .from('events')
      .select('title, venue_name, event_date, event_type')
      .in('event_date', dates);
    if (error) throw error;
    result.events = (data ?? []) as ExistingRow[];
  }
  if (scope === 'event_submissions' || scope === 'both') {
    const { data, error } = await supabase
      .from('event_submissions')
      .select('title, venue_name, event_date, event_type')
      .in('event_date', dates)
      .eq('status', 'pending');
    if (error) throw error;
    result.submissions = (data ?? []) as ExistingRow[];
  }
  return result;
}

const SAME_VENUE_TITLE_THRESHOLD = 0.5;

export function isMatch(
  candidate: ExtractedCandidate,
  existing: ExistingRow,
  exactOnly = false,
): { match: boolean; reason: string } {
  if (candidate.event_date !== existing.event_date) return { match: false, reason: '' };
  if (candidate.event_type !== existing.event_type) return { match: false, reason: '' };
  if (exactOnly) {
    // Save-time policy: the person has reviewed the list, so only drop rows that
    // are the very same event (same title, venue, date and type).
    const same =
      normalise(candidate.title) === normalise(existing.title) &&
      normalise(candidate.venue_name) === normalise(existing.venue_name);
    return same ? { match: true, reason: 'identical event already listed' } : { match: false, reason: '' };
  }

  const candVenue = normalise(candidate.venue_name);
  const exVenue = normalise(existing.venue_name);

  // Primary: exact (normalised) venue match
  // Same venue/date/type is only a duplicate when the titles are also alike —
  // venues often run two different games on one day.
  if (candVenue && exVenue && candVenue === exVenue) {
    const score = fuzzyTitleScore(candidate.title, existing.title);
    if (score >= SAME_VENUE_TITLE_THRESHOLD) {
      return { match: true, reason: `same venue, date & type, similar title (${Math.round(score * 100)}%)` };
    }
    return { match: false, reason: '' };
  }

  // Fallback: if either side has no venue or it's "unknown", fall back to fuzzy title match
  const venueMissing = !candVenue || !exVenue || candVenue === 'unknown venue' || exVenue === 'unknown venue';
  if (venueMissing) {
    const score = fuzzyTitleScore(candidate.title, existing.title);
    if (score >= FUZZY_THRESHOLD) {
      return { match: true, reason: `similar title on same date (${Math.round(score * 100)}%)` };
    }
  }
  return { match: false, reason: '' };
}

/**
 * Filter out candidates that already exist in `events` and/or `event_submissions`.
 * Match key: (venue_name, event_date, event_type), with fuzzy title fallback when
 * either venue is missing.
 */
export async function dedupeCandidates<T extends ExtractedCandidate>(
  candidates: T[],
  scope: DedupeScope = 'both',
  options?: { exactOnly?: boolean },
): Promise<DedupeResult<T>> {
  const exactOnly = options?.exactOnly ?? false;
  if (candidates.length === 0) return { unique: [], duplicates: [] };

  const dates = Array.from(new Set(candidates.map((c) => c.event_date).filter(Boolean)));
  const { events, submissions } = await fetchExisting(dates, scope);

  const unique: T[] = [];
  const duplicates: DedupeResult<T>['duplicates'] = [];

  // Also dedupe within the candidate batch itself.
  const seenInBatch: ExistingRow[] = [];

  for (const c of candidates) {
    let matched: { matchedIn: 'events' | 'event_submissions'; reason: string } | null = null;

    for (const ev of events) {
      const r = isMatch(c, ev, exactOnly);
      if (r.match) {
        matched = { matchedIn: 'events', reason: r.reason };
        break;
      }
    }
    if (!matched) {
      for (const sub of submissions) {
        const r = isMatch(c, sub, exactOnly);
        if (r.match) {
          matched = { matchedIn: 'event_submissions', reason: r.reason };
          break;
        }
      }
    }
    if (!matched) {
      for (const prev of seenInBatch) {
        const r = isMatch(c, prev, exactOnly);
        if (r.match) {
          matched = { matchedIn: scope === 'events' ? 'events' : 'event_submissions', reason: `duplicate within this batch (${r.reason})` };
          break;
        }
      }
    }

    if (matched) {
      duplicates.push({ candidate: c, matchedIn: matched.matchedIn, reason: matched.reason });
    } else {
      unique.push(c);
      seenInBatch.push({
        title: c.title,
        venue_name: c.venue_name ?? null,
        event_date: c.event_date,
        event_type: c.event_type,
      });
    }
  }

  return { unique, duplicates };
}
