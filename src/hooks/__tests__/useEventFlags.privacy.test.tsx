import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const rpcSpy = vi.fn();
const fromSpy = vi.fn();
const selectSpy = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string, args?: unknown) => {
      rpcSpy(name, args);
      const g = globalThis as { __rpcResult?: { data: unknown; error: unknown } };
      return Promise.resolve(g.__rpcResult ?? { data: [], error: null });
    },
    from: (t: string) => {
      fromSpy(t);
      const chain = {
        select: (cols: string) => { selectSpy(cols); return chain; },
        eq: () => Promise.resolve({ data: [{ event_id: 'e1' }, { event_id: 'e2' }, { event_id: 'e1' }], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
      };
      return chain;
    },
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAdminEventFlags, useFlaggedEventIds, mapAdminFlagRows } from '../useEventFlags';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const row = {
  id: 'f1', event_id: 'e1', reason: 'wrong_date', details: 'Organiser page says 8 Nov',
  suggested_date: '2026-11-08', created_at: '2026-11-01T10:00:00Z', resolved_at: null, is_resolved: false,
  event_title: 'Halloween Cup', event_venue_name: 'NPF Bassetts Pole', event_date: '2026-11-01',
};

describe('event flag confidentiality', () => {
  beforeEach(() => {
    rpcSpy.mockClear(); fromSpy.mockClear(); selectSpy.mockClear();
    (globalThis as { __rpcResult?: unknown }).__rpcResult = undefined;
  });

  it('public markers request only event IDs, never report text', async () => {
    const { result } = renderHook(() => useFlaggedEventIds(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(selectSpy).toHaveBeenCalledWith('event_id');
    expect(selectSpy.mock.calls.flat().join(',')).not.toMatch(/details|suggested_date|reason|delete_token/);
    expect([...result.current.data!].sort()).toEqual(['e1', 'e2']);
  });

  it('moderation list reads through the admin-checked RPC, not the table', async () => {
    (globalThis as { __rpcResult?: unknown }).__rpcResult = { data: [row], error: null };
    const { result } = renderHook(() => useAdminEventFlags(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcSpy).toHaveBeenCalledWith('get_admin_event_flags', undefined);
    expect(fromSpy).not.toHaveBeenCalledWith('event_flags');
    expect(result.current.data![0]).toMatchObject({
      details: 'Organiser page says 8 Nov', suggested_date: '2026-11-08',
      events: { title: 'Halloween Cup', venue_name: 'NPF Bassetts Pole', event_date: '2026-11-01' },
    });
  });

  it('surfaces a Forbidden error for non-admin callers instead of an empty list', async () => {
    (globalThis as { __rpcResult?: unknown }).__rpcResult = { data: null, error: { message: 'Forbidden' } };
    const { result } = renderHook(() => useAdminEventFlags(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('maps flags whose event no longer exists to events: null', () => {
    const [m] = mapAdminFlagRows([{ ...row, event_title: null, event_venue_name: null, event_date: null }]);
    expect(m.events).toBeNull();
    expect(m).not.toHaveProperty('delete_token');
  });
});
