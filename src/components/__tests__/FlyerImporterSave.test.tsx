import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Chainable no-op query builder: duplicate lookups find nothing.
const chain: any = new Proxy(function () {}, {
  get: (_t, k) => (k === 'then' ? (r: (v: unknown) => void) => r({ data: [], error: null }) : chain),
  apply: () => chain,
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => chain,
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}));
vi.mock('@/hooks/useVenueDetails', () => ({ useVenueDetails: () => ({ data: new Map() }) }));

import { FlyerImporter } from '@/components/FlyerImporter';

const KEY = 'flyer-importer-draft-v1';
const cand = (n: number) => ({
  title: `QA event ${n}`, event_type: 'walk_on', event_date: '2026-12-0' + n,
  venue_name: 'QA Venue', _id: `c${n}`, _selected: true, _submissionId: `sub-${n}`,
});
function seed(cands: unknown[]) {
  localStorage.setItem(KEY, JSON.stringify({ v: 1, savedAt: Date.now(), tab: 'text', sourceUrl: '', pastedText: '', candidates: cands }));
}
const draft = () => JSON.parse(localStorage.getItem(KEY) ?? '{"candidates":[]}').candidates as { _submissionId: string }[];
function mount(onSave: any) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}><FlyerImporter onSave={onSave} saveLabel="Submit" /></QueryClientProvider>);
}
const clickSave = () => fireEvent.click(screen.getByRole('button', { name: /Submit \(/ }));

beforeEach(() => { cleanup(); localStorage.clear(); });

describe('flyer importer save contract', () => {
  it('partial failure removes only confirmed rows and keeps failures in the stored draft', async () => {
    seed([cand(1), cand(2)]);
    const onSave = vi.fn().mockResolvedValue({ savedIds: ['sub-1'] });
    mount(onSave);
    clickSave();
    await waitFor(() => expect(draft().map((c) => c._submissionId)).toEqual(['sub-2']));
    expect(screen.queryByDisplayValue('QA event 1')).toBeNull();
  });

  it('after a refresh the retry reuses the same persisted ids (no duplicates)', async () => {
    seed([cand(2)]);
    const onSave = vi.fn().mockResolvedValue(true);
    mount(onSave);
    clickSave();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].map((c: any) => c._submissionId)).toEqual(['sub-2']);
  });

  it('gives drafts from older versions a stable id that survives reload', () => {
    const { _submissionId, ...legacy } = cand(3);
    seed([legacy]);
    mount(vi.fn());
    const first = draft()[0]._submissionId;
    expect(first).toBeTruthy();
    cleanup(); mount(vi.fn());
    expect(draft()[0]._submissionId).toBe(first);
  });

  it('admin failure (false) keeps the whole list', async () => {
    seed([cand(1), cand(2)]);
    const onSave = vi.fn().mockResolvedValue(false);
    mount(onSave);
    clickSave();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(draft()).toHaveLength(2);
  });

  it('a thrown error keeps the whole list', async () => {
    seed([cand(1)]);
    mount(vi.fn().mockRejectedValue(new Error('boom')));
    clickSave();
    await waitFor(() => expect(draft()).toHaveLength(1));
  });
});
