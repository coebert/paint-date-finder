import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

let rpcResult: { data: unknown; error: null | { message: string } } = { data: true, error: null };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: () => Promise.resolve(rpcResult) },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useDeletePlayerSeekingPost } from '@/hooks/usePlayerSeekingPosts';
import { toast } from 'sonner';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('self-removal of a Looking for a Game post', () => {
  it('reports removal only when the server confirms it', async () => {
    rpcResult = { data: true, error: null };
    const { result } = renderHook(() => useDeletePlayerSeekingPost(), { wrapper });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.mutateAsync({ id: 'a', token: 'b' }); });
    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Post removed.');
  });

  it('does not claim removal when the link is wrong or expired (server returns null)', async () => {
    (toast.success as ReturnType<typeof vi.fn>).mockClear();
    rpcResult = { data: null, error: null };
    const { result } = renderHook(() => useDeletePlayerSeekingPost(), { wrapper });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.mutateAsync({ id: 'a', token: 'bad' }); });
    expect(ok).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
