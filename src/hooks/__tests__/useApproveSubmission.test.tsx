import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const rpcSpy = vi.fn();
const fromSpy = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string, args: unknown) => {
      rpcSpy(name, args);
      const g = globalThis as { __rpcResult?: { data: unknown; error: unknown } };
      return Promise.resolve(g.__rpcResult ?? { data: { event_id: 'e1', duplicate: false, basis: 'human_review' }, error: null });
    },
    from: (t: string) => {
      fromSpy(t);
      return {};
    },
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useApproveSubmission } from '../useSubmissions';
import type { EventSubmission } from '@/types/submissions';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const sub = {
  id: 'sub-1', title: 'Diamond Wars', event_type: 'big_game', venue_name: 'NPF Bassetts Pole',
  event_date: '2026-06-28', source_url: 'https://npf.example/events', status: 'pending',
} as unknown as EventSubmission;

describe('useApproveSubmission (server-side approval with evidence)', () => {
  beforeEach(() => {
    rpcSpy.mockClear();
    fromSpy.mockClear();
    (globalThis as { __rpcResult?: unknown }).__rpcResult = undefined;
  });

  it('refuses to approve without the moderator confirming the source date', async () => {
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });
    result.current.mutate({ submission: sub, confirmedSourceDate: false });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('approves through approve_submission and never writes events directly', async () => {
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });
    result.current.mutate({ submission: sub, confirmedSourceDate: true, adminNotes: 'checked' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcSpy).toHaveBeenCalledWith('approve_submission', {
      _id: 'sub-1', _source_url: 'https://npf.example/events', _confirmed_source_date: true, _notes: 'checked',
    });
    expect(fromSpy).not.toHaveBeenCalledWith('events');
  });

  it('uses the source link the moderator entered', async () => {
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });
    result.current.mutate({ submission: { ...sub, source_url: null }, confirmedSourceDate: true, sourceUrl: 'https://venue.example/walk-on' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcSpy.mock.calls[0][1]._source_url).toBe('https://venue.example/walk-on');
  });

  it('surfaces a server refusal (e.g. no source link) as an error', async () => {
    (globalThis as { __rpcResult?: unknown }).__rpcResult = { data: null, error: { message: 'A source link (organiser, venue or event page) is required' } };
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });
    result.current.mutate({ submission: { ...sub, source_url: null }, confirmedSourceDate: true });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('reports a same-day duplicate match', async () => {
    (globalThis as { __rpcResult?: unknown }).__rpcResult = { data: { event_id: 'old', duplicate: true, basis: 'human_review' }, error: null };
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });
    result.current.mutate({ submission: sub, confirmedSourceDate: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.mergedIntoEventId).toBe('old');
  });
});
