import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const insertSpy = vi.fn();
let nextResult: { error: null | { code?: string; message: string } } = { error: null };
const savedIds = new Set<string>();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      // Deliberately no .select(): public visitors cannot read submissions back,
      // so the hook must never ask for the inserted row.
      insert: (payload: { id: string }) => {
        insertSpy(table, payload);
        if (nextResult.error) return Promise.resolve(nextResult);
        if (savedIds.has(payload.id)) {
          return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
        }
        savedIds.add(payload.id);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import { useCreateSubmission, friendlySubmissionError } from '@/hooks/useSubmissions';

const submission = {
  title: 'QA walk-on',
  event_type: 'walk_on' as const,
  venue_name: 'QA Venue',
  event_date: '2026-12-01',
  submitter_email: 'qa@example.com',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCreateSubmission', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    savedIds.clear();
    nextResult = { error: null };
  });

  it('saves a public submission without needing to read it back', async () => {
    const { result } = renderHook(() => useCreateSubmission(), { wrapper });
    let out: { id: string; alreadySaved: boolean } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync({ id: 'id-1', submission });
    });
    expect(out).toEqual({ id: 'id-1', alreadySaved: false });
    expect(insertSpy).toHaveBeenCalledWith('event_submissions', expect.objectContaining({ id: 'id-1', status: 'pending', admin_notes: null, reviewed_at: null }));
  });

  it('cannot be used to pre-approve: status is always forced to pending', async () => {
    const { result } = renderHook(() => useCreateSubmission(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'id-2', submission: { ...submission, status: 'approved' } as never });
    });
    expect(insertSpy.mock.calls[0][1].status).toBe('pending');
  });

  it('retrying with the same id reports already saved instead of duplicating', async () => {
    const { result } = renderHook(() => useCreateSubmission(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'id-3', submission });
    });
    let retry: { alreadySaved: boolean } | undefined;
    await act(async () => {
      retry = await result.current.mutateAsync({ id: 'id-3', submission });
    });
    expect(retry?.alreadySaved).toBe(true);
    expect(savedIds.size).toBe(1);
  });

  it('surfaces real failures so the form can keep the entered values', async () => {
    nextResult = { error: { code: '23514', message: 'violates check constraint' } };
    const { result } = renderHook(() => useCreateSubmission(), { wrapper });
    let caught: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ id: 'id-4', submission });
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBeTruthy();
    expect(friendlySubmissionError(caught)).toMatch(/Check the date, links and email/);
  });

  it('explains network failures in plain words', () => {
    expect(friendlySubmissionError(new TypeError('Failed to fetch'))).toMatch(/could not reach the server/);
  });
});
