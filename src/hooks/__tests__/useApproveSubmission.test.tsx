import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Capture inserted payload
const insertSpy = vi.fn();
const updateSpy = vi.fn();
const selectMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'events') {
          return {
            insert: (payload: any) => {
              insertSpy(payload);
              return Promise.resolve({ error: null });
            },
            select: () => ({
              order: () => ({
                eq: (col: string, val: any) => {
                  selectMock(col, val);
                  // Return only verified rows
                  const rows = (globalThis as any).__events ?? [];
                  const filtered = col === 'is_verified' ? rows.filter((r: any) => r.is_verified === val) : rows;
                  return Promise.resolve({ data: filtered, error: null });
                },
              }),
            }),
          };
        }
        if (table === 'event_submissions') {
          return {
            update: (payload: any) => ({
              eq: (_col: string, _val: any) => {
                updateSpy(payload);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return {} as any;
      },
    },
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useApproveSubmission } from '../useSubmissions';
import { useEvents } from '../useEvents';
import type { EventSubmission } from '@/types/submissions';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const sampleSubmission: EventSubmission = {
  id: 'sub-1',
  title: 'Diamond Wars 2026 - Event 2',
  description: null,
  event_type: 'big_game' as any,
  venue_name: 'NPF Bassetts Pole',
  venue_location: null,
  event_date: '2026-06-28',
  start_time: null,
  end_time: null,
  booking_url: null,
  price_info: null,
  source_url: null,
  image_url: null,
  submitter_email: 'a@b.com',
  submitter_name: null,
  status: 'pending' as any,
  admin_notes: null,
  reviewed_at: null,
  created_at: new Date().toISOString(),
};

describe('useApproveSubmission', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    updateSpy.mockClear();
    selectMock.mockClear();
    (globalThis as any).__events = [];
  });

  it('inserts approved submissions with is_verified=true so they appear on the calendar', async () => {
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });

    result.current.mutate({ submission: sampleSubmission });

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));

    const payload = insertSpy.mock.calls[0][0];
    expect(payload.is_verified).toBe(true);
    expect(payload.title).toBe('Diamond Wars 2026 - Event 2');
    expect(payload.event_date).toBe('2026-06-28');
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
  });

  it('event from approved submission is visible to verified-only calendar query', async () => {
    // Simulate the approval having persisted the event
    (globalThis as any).__events = [
      { id: 'e1', title: sampleSubmission.title, event_date: sampleSubmission.event_date, is_verified: true },
    ];

    const { result } = renderHook(
      () => useEvents({ verifiedOnly: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(selectMock).toHaveBeenCalledWith('is_verified', true);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('Diamond Wars 2026 - Event 2');
  });

  it('does not insert a duplicate event when approving an already-approved submission', async () => {
    const approvedSubmission = { ...sampleSubmission, status: 'approved' as any };
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });

    result.current.mutate({ submission: approvedSubmission });

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));

    // Event insert should be skipped for already-approved submissions
    expect(insertSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
  });
});
