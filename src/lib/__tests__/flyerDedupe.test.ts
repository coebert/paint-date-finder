import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractedCandidate } from '@/lib/flyerExtraction';

type Row = { title: string; venue_name: string | null; event_date: string; event_type: string; status?: string };

const state: { events: Row[]; submissions: Row[] } = { events: [], submissions: [] };

vi.mock('@/integrations/supabase/client', () => {
  const buildQuery = (rows: Row[], filterStatus?: string) => {
    let filtered = rows;
    const q: any = {
      select: () => q,
      in: (_col: string, dates: string[]) => {
        filtered = filtered.filter((r) => dates.includes(r.event_date));
        return q;
      },
      eq: (col: string, val: string) => {
        if (col === 'status') filtered = filtered.filter((r) => r.status === val);
        return Promise.resolve({ data: filtered, error: null });
      },
      then: (resolve: any) => resolve({ data: filtered, error: null }),
    };
    return q;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'events') return buildQuery(state.events);
        if (table === 'event_submissions') return buildQuery(state.submissions, 'pending');
        return {} as any;
      },
    },
  };
});

import { dedupeCandidates } from '../flyerDedupe';

const c = (over: Partial<ExtractedCandidate>): ExtractedCandidate => ({
  title: 'Walk-on',
  event_type: 'walk_on',
  event_date: '2026-07-01',
  venue_name: 'NPF Bassetts Pole',
  ...over,
});

beforeEach(() => {
  state.events = [];
  state.submissions = [];
});

describe('dedupeCandidates', () => {
  it('returns everything unique when no existing rows', async () => {
    const { unique, duplicates } = await dedupeCandidates([c({}), c({ event_date: '2026-07-02' })]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(0);
  });

  it('flags a duplicate when venue+date+type match an existing event', async () => {
    state.events = [
      { title: 'Existing name', venue_name: 'NPF Bassetts Pole', event_date: '2026-07-01', event_type: 'walk_on' },
    ];
    const { unique, duplicates } = await dedupeCandidates([c({})]);
    expect(unique).toHaveLength(0);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].matchedIn).toBe('events');
  });

  it('ignores non-matching date or type', async () => {
    state.events = [
      { title: 'X', venue_name: 'NPF Bassetts Pole', event_date: '2026-07-01', event_type: 'big_game' },
    ];
    const { unique } = await dedupeCandidates([c({})]); // walk_on vs big_game
    expect(unique).toHaveLength(1);
  });

  it('normalises venue punctuation/case when matching', async () => {
    state.events = [
      { title: 'X', venue_name: 'npf   bassetts-pole!!', event_date: '2026-07-01', event_type: 'walk_on' },
    ];
    const { duplicates } = await dedupeCandidates([c({})]);
    expect(duplicates).toHaveLength(1);
  });

  it('falls back to fuzzy title match when venue is missing/unknown', async () => {
    state.events = [
      { title: 'Diamond Wars 2026 Event 2', venue_name: 'Unknown venue', event_date: '2026-07-01', event_type: 'walk_on' },
    ];
    const { duplicates } = await dedupeCandidates([
      c({ title: 'Diamond Wars 2026 - Event 2', venue_name: null }),
    ]);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].reason).toMatch(/similar title/);
  });

  it('does not fuzzy-match when both venues are known and different', async () => {
    state.events = [
      { title: 'Diamond Wars 2026 Event 2', venue_name: 'Different Site', event_date: '2026-07-01', event_type: 'walk_on' },
    ];
    const { unique } = await dedupeCandidates([
      c({ title: 'Diamond Wars 2026 - Event 2', venue_name: 'NPF Bassetts Pole' }),
    ]);
    expect(unique).toHaveLength(1);
  });

  it('dedupes duplicates within the same batch', async () => {
    const { unique, duplicates } = await dedupeCandidates([c({}), c({}), c({ event_date: '2026-08-01' })]);
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].reason).toMatch(/within this batch/);
  });

  it('honours scope=events (skips submissions lookup)', async () => {
    state.submissions = [
      { title: 'X', venue_name: 'NPF Bassetts Pole', event_date: '2026-07-01', event_type: 'walk_on', status: 'pending' },
    ];
    const { unique } = await dedupeCandidates([c({})], 'events');
    expect(unique).toHaveLength(1);
  });

  it('matches against pending submissions when scope=both', async () => {
    state.submissions = [
      { title: 'X', venue_name: 'NPF Bassetts Pole', event_date: '2026-07-01', event_type: 'walk_on', status: 'pending' },
    ];
    const { duplicates } = await dedupeCandidates([c({})], 'both');
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].matchedIn).toBe('event_submissions');
  });

  it('handles empty candidate list', async () => {
    const r = await dedupeCandidates([]);
    expect(r).toEqual({ unique: [], duplicates: [] });
  });
});
