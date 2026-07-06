/// <reference types="google.maps" />

export const UK_CENTER = { lat: 54.5, lng: -3.0 };
export const UK_ZOOM = 6;

/** Dark map style aligned with the app's tactical aesthetic. */
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f2117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca38a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3d2c' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#5a5e44' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2d20' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1a2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3b6fa0' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#262a1c' }] },
];

let mapsLoadingPromise: Promise<typeof google> | null = null;

/**
 * Load the Google Maps JS SDK once per session and reuse the promise.
 * Rejects if the browser key isn't configured or the script fails to load.
 */
export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  const win = window as unknown as { google?: typeof google };
  if (win.google?.maps) return Promise.resolve(win.google);
  if (mapsLoadingPromise) return mapsLoadingPromise;

  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
    | string
    | undefined;
  const trackingId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
    | string
    | undefined;
  if (!browserKey) return Promise.reject(new Error('Missing Google Maps browser key'));

  mapsLoadingPromise = new Promise((resolve, reject) => {
    const cbName = `__initGoogleMaps_${Math.random().toString(36).slice(2)}`;
    (window as unknown as Record<string, unknown>)[cbName] = () => {
      delete (window as unknown as Record<string, unknown>)[cbName];
      resolve((window as unknown as { google: typeof google }).google);
    };

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: browserKey,
      loading: 'async',
      callback: cbName,
      libraries: 'marker',
    });
    if (trackingId) params.set('channel', trackingId);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapsLoadingPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return mapsLoadingPromise;
}
