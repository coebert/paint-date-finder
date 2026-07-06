import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import React from 'react';
import { useEventFiltersUrl } from '../useEventFiltersUrl';

function wrap(initial = '/') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
  };
}

/** Renders the hook alongside useLocation so tests can assert URL state. */
function renderFilters(initial = '/') {
  return renderHook(
    () => ({ filters: useEventFiltersUrl(), location: useLocation() }),
    { wrapper: wrap(initial) },
  );
}

describe('useEventFiltersUrl', () => {
  it('returns sensible defaults when URL is empty', () => {
    const { result } = renderFilters('/');
    expect(result.current.filters.view).toBe('calendar');
    expect(result.current.filters.eventType).toBeUndefined();
    expect(result.current.filters.beginnerOnly).toBe(false);
    expect(result.current.filters.venue).toBe('');
    expect(result.current.filters.region).toBe('');
    expect(result.current.filters.verifiedOnly).toBe(true);
  });

  it('parses filters from URL params', () => {
    const { result } = renderFilters(
      '/?view=list&type=big_game&beginner=1&venue=NPF&region=south-east&verified=0',
    );
    expect(result.current.filters.view).toBe('list');
    expect(result.current.filters.eventType).toBe('big_game');
    expect(result.current.filters.beginnerOnly).toBe(true);
    expect(result.current.filters.venue).toBe('NPF');
    expect(result.current.filters.region).toBe('south-east');
    expect(result.current.filters.verifiedOnly).toBe(false);
  });

  it('rejects invalid view/type params, falling back to defaults', () => {
    const { result } = renderFilters('/?view=bogus&type=not_a_type');
    expect(result.current.filters.view).toBe('calendar');
    expect(result.current.filters.eventType).toBeUndefined();
  });

  it('omits defaults from URL (view=calendar, verifiedOnly=true)', () => {
    const { result } = renderFilters('/?view=list&verified=0');
    act(() => result.current.filters.setView('calendar'));
    act(() => result.current.filters.setVerifiedOnly(true));
    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('view')).toBeNull();
    expect(params.get('verified')).toBeNull();
  });

  it('writes non-default values to the URL', () => {
    const { result } = renderFilters('/');
    act(() => result.current.filters.setView('map'));
    act(() => result.current.filters.setEventType('speedball'));
    act(() => result.current.filters.setBeginnerOnly(true));
    act(() => result.current.filters.setVenue('NPF'));
    act(() => result.current.filters.setRegion('south-east'));
    act(() => result.current.filters.setVerifiedOnly(false));

    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('view')).toBe('map');
    expect(params.get('type')).toBe('speedball');
    expect(params.get('beginner')).toBe('1');
    expect(params.get('venue')).toBe('NPF');
    expect(params.get('region')).toBe('south-east');
    expect(params.get('verified')).toBe('0');
  });

  it('clearAll removes filter keys but preserves defaults (view stays)', () => {
    const { result } = renderFilters(
      '/?view=list&type=big_game&beginner=1&venue=NPF&region=r&verified=0',
    );
    act(() => result.current.filters.clearAll());
    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('type')).toBeNull();
    expect(params.get('beginner')).toBeNull();
    expect(params.get('venue')).toBeNull();
    expect(params.get('region')).toBeNull();
    expect(params.get('verified')).toBeNull();
    // view is NOT cleared by clearAll — it's a view mode, not a filter.
    expect(params.get('view')).toBe('list');
  });

  it('setting a filter to empty removes it from the URL', () => {
    const { result } = renderFilters('/?venue=NPF&region=r');
    act(() => result.current.filters.setVenue(''));
    act(() => result.current.filters.setRegion(''));
    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('venue')).toBeNull();
    expect(params.get('region')).toBeNull();
  });
});
