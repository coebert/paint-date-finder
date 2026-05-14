import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from '@/lib/geo';

const STORAGE_KEY = 'faw:user-location';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error' | 'unsupported';
export type LocationSource = 'gps' | 'manual';

interface StoredLocation {
  coords: LatLng;
  capturedAt: number;
  radiusMiles: number;
  source?: LocationSource;
  label?: string;
}

function readStored(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocation;
    if (!parsed?.coords || typeof parsed.coords.lat !== 'number') return null;
    if (Date.now() - parsed.capturedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(value: StoredLocation | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function useUserLocation(defaultRadius = 25) {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [radiusMiles, setRadiusMilesState] = useState<number>(defaultRadius);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<LocationSource | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setCoords(stored.coords);
      setRadiusMilesState(stored.radiusMiles ?? defaultRadius);
      setSource(stored.source ?? 'gps');
      setLabel(stored.label ?? null);
      setStatus('granted');
    }
  }, [defaultRadius]);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setStatus('loading');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setStatus('granted');
        setSource('gps');
        setLabel(null);
        writeStored({ coords: next, capturedAt: Date.now(), radiusMiles, source: 'gps' });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Location permission denied. Enable it in your browser settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('error');
          setError('Location unavailable right now. Try again in a moment.');
        } else if (err.code === err.TIMEOUT) {
          setStatus('error');
          setError('Location request timed out. Please try again.');
        } else {
          setStatus('error');
          setError(err.message || 'Could not get your location.');
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [radiusMiles]);

  const setManualLocation = useCallback(
    (next: LatLng, nextLabel: string) => {
      setCoords(next);
      setStatus('granted');
      setSource('manual');
      setLabel(nextLabel);
      setError(null);
      writeStored({
        coords: next,
        capturedAt: Date.now(),
        radiusMiles,
        source: 'manual',
        label: nextLabel,
      });
    },
    [radiusMiles],
  );

  const setRadiusMiles = useCallback(
    (n: number) => {
      setRadiusMilesState(n);
      if (coords) {
        writeStored({
          coords,
          capturedAt: Date.now(),
          radiusMiles: n,
          source: source ?? 'gps',
          label: label ?? undefined,
        });
      }
    },
    [coords, source, label],
  );

  const clear = useCallback(() => {
    setCoords(null);
    setStatus('idle');
    setError(null);
    setSource(null);
    setLabel(null);
    writeStored(null);
  }, []);

  return {
    coords,
    status,
    error,
    radiusMiles,
    source,
    label,
    setRadiusMiles,
    request,
    setManualLocation,
    clear,
  };
}
