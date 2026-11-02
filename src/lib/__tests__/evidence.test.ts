import { describe, it, expect } from 'vitest';
import {
  checkCandidateEvidence, extractExplicitDates, recheckStoredEvidence, sameEventIdentity,
  icsEventLines, jsonLdEventLines, detectUnavailable, type EvidenceContext,
} from '../../../supabase/functions/_shared/evidence';

const filler = ' Welcome to Skirmish Paintball, the best paintball site in the county. Kit hire included, 0.68 calibre markers. '.repeat(3);
const page = filler +
  'Upcoming: Walk-On Sunday 8th November 2026, gates open 09:00, £25 entry including 100 balls. ' +
  'Big Game: Operation Thunder on 15/11/2026. We play every Sunday. ' +
  'Halloween Special was cancelled - 22 November 2026 walk-on cancelled due to flooding. ' +
  'Walk-on Saturday 14 November 2026 and Mag-Fed Saturday 14 November 2026 both run.';

const ctx = (over: Partial<EvidenceContext> = {}): EvidenceContext => ({
  pageText: page, sourceUrl: 'https://skirmish.example/events', venueName: 'Skirmish Paintball',
  multiVenue: false, today: '2026-11-02', maxDate: '2027-11-02', ...over,
});
const good = {
  title: 'Walk-On Sunday', event_type: 'walk_on', event_date: '2026-11-08',
  source_quote: 'Walk-On Sunday 8th November 2026, gates open 09:00, £25 entry including 100 balls.',
};

describe('event finder evidence gate', () => {
  it('accepts a genuine excerpt stating the exact date', () => {
    const v = checkCandidateEvidence({ ...good, start_time: '09:00', price_info: '£25' }, ctx());
    expect(v.ok).toBe(true);
    expect(v.cleaned.start_time).toBe('09:00');
    expect(v.cleaned.price_info).toBe('£25');
  });
  it('rejects a missing quote', () => {
    expect(checkCandidateEvidence({ ...good, source_quote: null }, ctx()).reasons).toContain('missing_quote');
  });
  it('rejects a forged quote whose first words are real but rest is invented', () => {
    const v = checkCandidateEvidence({ ...good, source_quote: 'Walk-On Sunday 8th November 2026, gates open 08:00, £15 entry and free lunch' }, ctx());
    expect(v.reasons).toContain('quote_not_in_source');
  });
  it('rejects a genuine quote with the wrong year (recurrence/next-year guess)', () => {
    const v = checkCandidateEvidence({ ...good, event_date: '2027-11-08' }, ctx());
    expect(v.reasons).toContain('quote_date_mismatch');
  });
  it('rejects a date the quote does not state (recurring "every Sunday")', () => {
    const v = checkCandidateEvidence({ ...good, event_date: '2026-11-29', source_quote: 'Operation Thunder on 15/11/2026. We play every Sunday.' }, ctx());
    expect(v.ok).toBe(false);
  });
  it('rejects a broad schedule with no full date', () => {
    const v = checkCandidateEvidence({ ...good, source_quote: 'We play every Sunday. Halloween Special was cancelled' }, ctx());
    expect(v.reasons).toContain('quote_has_no_full_date');
  });
  it('rejects an impossible date', () => {
    expect(checkCandidateEvidence({ ...good, event_date: '2026-02-30' }, ctx()).reasons).toContain('impossible_date');
  });
  it('blanks time and price the source does not state', () => {
    const v = checkCandidateEvidence({ ...good, source_quote: 'Big Game: Operation Thunder on 15/11/2026. We play every Sunday.', title: 'Operation Thunder', event_type: 'big_game', event_date: '2026-11-15', start_time: '09:30', price_info: '£35' }, ctx());
    expect(v.ok).toBe(true);
    expect(v.cleaned.start_time).toBeNull();
    expect(v.cleaned.price_info).toBeNull();
  });
  it('requires the venue in the excerpt for multi-venue sources', () => {
    const v = checkCandidateEvidence(good, ctx({ multiVenue: true, venueName: 'Delta Force Paintball Leeds' }));
    expect(v.reasons).toContain('quote_does_not_name_venue');
  });
  it('treats login walls and bot challenges as unavailable, never guessing', () => {
    const v = checkCandidateEvidence(good, ctx({ pageText: 'Just a moment... Checking your browser before accessing. ' + good.source_quote + ' paintball'.repeat(20) }));
    expect(v.reasons.some((r) => r.startsWith('source_unavailable'))).toBe(true);
    expect(detectUnavailable('short')).toBe('page_empty');
  });
  it('rejects airsoft sources', () => {
    const v = checkCandidateEvidence(good, ctx({ pageText: 'Airsoft skirmish site. '.repeat(20) + good.source_quote.replace('Walk-On', 'Airsoft Walk-On') }));
    expect(v.reasons).toContain('source_not_paintball');
  });
  it('marks a cancellation for review instead of a new event', () => {
    const v = checkCandidateEvidence({ title: 'Walk-On', event_type: 'walk_on', event_date: '2026-11-22', source_quote: '22 November 2026 walk-on cancelled due to flooding.' }, ctx());
    expect(v.ok).toBe(true);
    expect(v.kind).toBe('cancellation');
  });
});

describe('dates and identity', () => {
  it('needs an explicit year', () => {
    expect(extractExplicitDates('Sunday 8th November')).toEqual([]);
    expect(extractExplicitDates('10-11 October 2026')).toEqual(['2026-10-10', '2026-10-11']);
    expect(extractExplicitDates('08/11/2026')).toEqual(['2026-11-08']);
  });
  it('keeps distinct same-venue same-day events apart', () => {
    expect(sameEventIdentity('Walk-on Saturday', 'Mag-Fed Saturday')).toBe(false);
    expect(sameEventIdentity('Walk-On Day', 'walk-on day')).toBe(true);
  });
  it('does not expand ICS repeats', () => {
    const lines = icsEventLines('BEGIN:VEVENT\nSUMMARY:Walk on\nDTSTART;VALUE=DATE:20261108\nRRULE:FREQ=WEEKLY\nEND:VEVENT');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('2026-11-08');
    expect(lines[0]).toContain('repeats');
  });
  it('reads JSON-LD events including cancelled status', () => {
    const l = jsonLdEventLines('<script type="application/ld+json">{"@type":"Event","name":"Big Game","startDate":"2026-12-06T09:00","eventStatus":"https://schema.org/EventCancelled"}</script>');
    expect(l[0]).toMatch(/Big Game \| date 2026-12-06 .*EventCancelled/);
  });
});

describe('re-check of stored events', () => {
  it('missing excerpt is needs_evidence, not fake', () => {
    expect(recheckStoredEvidence({ event_date: '2026-11-08', source_quote: null }, page).status).toBe('needs_evidence');
  });
  it('excerpt stating another date is contradicted', () => {
    expect(recheckStoredEvidence({ event_date: '2026-11-09', source_quote: good.source_quote }, page).status).toBe('contradicted');
  });
  it('confirmed when excerpt with exact date is on the page', () => {
    expect(recheckStoredEvidence({ event_date: '2026-11-08', source_quote: good.source_quote }, page).status).toBe('source_confirmed');
  });
  it('unreachable source is unavailable', () => {
    expect(recheckStoredEvidence({ event_date: '2026-11-08', source_quote: good.source_quote }, null).status).toBe('unavailable');
  });
  it('excerpt gone from page is stale', () => {
    expect(recheckStoredEvidence({ event_date: '2026-11-08', source_quote: good.source_quote }, filler).status).toBe('stale');
  });
});

describe('sport is judged from the event section', () => {
  const nav = 'Home | Paintball | Shop | Contact. ';
  const airsoft = ' Proving Grounds airsoft skirmish. Airsoft walk-on Sunday 8th November 2026 at the airsoft site, bring your airsoft RIF. ';
  it('rejects an airsoft shop that only links to paintball in its nav', () => {
    const p = nav + 'x '.repeat(500) + airsoft;
    const v = checkCandidateEvidence({ title: 'Airsoft walk-on Sunday', event_type: 'walk_on', event_date: '2026-11-08',
      source_quote: 'Airsoft walk-on Sunday 8th November 2026 at the airsoft site' }, ctx({ pageText: p }));
    expect(v.ok).toBe(false);
  });
  it('still accepts a paintball section on a page that mentions airsoft elsewhere', () => {
    const p = 'We also run airsoft at our other site. ' + 'x '.repeat(500) + page;
    expect(checkCandidateEvidence(good, ctx({ pageText: p })).ok).toBe(true);
  });
});
