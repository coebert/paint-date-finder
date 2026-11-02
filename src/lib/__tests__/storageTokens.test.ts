import { describe, it, expect, vi, afterEach } from 'vitest';
import { storeToken } from '@/hooks/useFieldLayouts';
import { storeFlagToken } from '@/hooks/useEventFlags';
import { onGoogleMapsAuthFailure } from '@/lib/googleMaps';

afterEach(() => vi.restoreAllMocks());

describe('token storage after a successful save', () => {
  it('layout token: reports false instead of throwing when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    expect(storeToken('id', 'tok')).toBe(false);
  });
  it('flag token: reports false instead of throwing when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(storeFlagToken('e', 'f', 't')).toBe(false);
  });
  it('flag token: true when storage works', () => {
    expect(storeFlagToken('e', 'f', 't')).toBe(true);
  });
});

describe('Google Maps auth failure', () => {
  it('notifies subscribers when Google calls gm_authFailure', async () => {
    const cb = vi.fn();
    onGoogleMapsAuthFailure(cb);
    // installAuthFailureHook runs inside loadGoogleMaps; simulate directly
    const { loadGoogleMaps } = await import('@/lib/googleMaps');
    loadGoogleMaps().catch(() => {});
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure?.();
    expect(cb).toHaveBeenCalled();
  });
});
