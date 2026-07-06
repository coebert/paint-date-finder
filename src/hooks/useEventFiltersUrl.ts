import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EventType, EVENT_TYPE_LABELS } from '@/types/events';

export type EventView = 'calendar' | 'list' | 'map';

const VIEW_STORAGE_KEY = 'faw:last-view';

const isEventView = (v: string | null): v is EventView =>
  v === 'calendar' || v === 'list' || v === 'map';

function readStoredView(): EventView {
  if (typeof window === 'undefined') return 'calendar';
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    return isEventView(raw) ? raw : 'calendar';
  } catch {
    return 'calendar';
  }
}

function writeStoredView(v: EventView) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  } catch {
    // ignore quota / private mode
  }
}


export interface EventFiltersUrlState {
  view: EventView;
  eventType: EventType | undefined;
  beginnerOnly: boolean;
  venue: string;
  region: string;
  verifiedOnly: boolean;
  setView: (v: EventView) => void;
  setEventType: (t: EventType | undefined) => void;
  setBeginnerOnly: (v: boolean) => void;
  setVenue: (v: string) => void;
  setRegion: (r: string) => void;
  setVerifiedOnly: (v: boolean) => void;
  clearAll: () => void;
}

/**
 * Single source of truth for the home-page event filter state.
 * Persists filters in the URL so views survive refresh, sharing and back/forward.
 *
 * Defaults (omitted from URL): view=calendar, verifiedOnly=true, everything else empty.
 */
export function useEventFiltersUrl(): EventFiltersUrlState {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const viewParam = searchParams.get('view');
    const typeParam = searchParams.get('type');
    // URL wins; when absent, restore the last view the user picked so
    // switching pages and coming back keeps their preferred layout.
    const view: EventView = isEventView(viewParam) ? viewParam : readStoredView();
    return {
      view,
      eventType:
        typeParam && typeParam in EVENT_TYPE_LABELS ? (typeParam as EventType) : undefined,
      beginnerOnly: searchParams.get('beginner') === '1',
      venue: searchParams.get('venue') ?? '',
      region: searchParams.get('region') ?? '',
      // Verified defaults to true; opt-out via ?verified=0.
      verifiedOnly: searchParams.get('verified') !== '0',
    };
  }, [searchParams]);


  const update = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (value === null || value === '') sp.delete(key);
          else sp.set(key, value);
          return sp;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    ...state,
    setView: useCallback(
      (v: EventView) => {
        writeStoredView(v);
        // Keep the URL clean when the view matches the default so shared
        // links don't leak per-user preferences.
        update('view', v === 'calendar' ? null : v);
      },
      [update],
    ),
    setEventType: useCallback((t) => update('type', t ?? null), [update]),
    setBeginnerOnly: useCallback((v) => update('beginner', v ? '1' : null), [update]),
    setVenue: useCallback((v) => update('venue', v || null), [update]),
    setRegion: useCallback((r) => update('region', r || null), [update]),
    setVerifiedOnly: useCallback((v) => update('verified', v ? null : '0'), [update]),
    clearAll: useCallback(() => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          for (const k of ['type', 'beginner', 'venue', 'region', 'verified']) sp.delete(k);
          return sp;
        },
        { replace: true },
      );
    }, [setSearchParams]),
  };
}
