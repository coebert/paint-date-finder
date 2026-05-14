import type { LatLng } from './geo';

// UK postcode: loose match (full or partial outward+inward).
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const PARTIAL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export interface GeocodeResult {
  coords: LatLng;
  label: string;
}

/** Geocode a UK postcode or town/place name to lat/lng. */
export async function geocodeUK(query: string): Promise<GeocodeResult> {
  const q = query.trim();
  if (!q) throw new Error('Enter a postcode or town.');

  // Full UK postcode → postcodes.io
  if (POSTCODE_RE.test(q)) {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      const r = json?.result;
      if (r?.latitude && r?.longitude) {
        return {
          coords: { lat: r.latitude, lng: r.longitude },
          label: `${r.postcode}${r.admin_district ? ', ' + r.admin_district : ''}`,
        };
      }
    }
    throw new Error('Postcode not found.');
  }

  // Partial postcode (e.g. "SW1") → outcodes endpoint
  if (PARTIAL_POSTCODE_RE.test(q)) {
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      const r = json?.result;
      if (r?.latitude && r?.longitude) {
        return {
          coords: { lat: r.latitude, lng: r.longitude },
          label: `${r.outcode}${r.admin_district?.[0] ? ', ' + r.admin_district[0] : ''}`,
        };
      }
    }
    throw new Error('Postcode area not found.');
  }

  // Town / place name → Nominatim (UK-bounded)
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('countrycodes', 'gb');
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Location lookup failed. Please try again.');
  const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!arr.length) throw new Error('No matching place found in the UK.');
  const hit = arr[0];
  return {
    coords: { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) },
    label: hit.display_name.split(',').slice(0, 2).join(',').trim(),
  };
}
