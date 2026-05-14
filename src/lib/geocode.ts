import type { LatLng } from './geo';

// UK postcode: loose match (full or partial outward+inward).
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const PARTIAL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

const STORAGE_KEY = 'faw:geocode-cache';
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MEM_LIMIT = 200; // in-memory LRU entries

export interface GeocodeResult {
  coords: LatLng;
  label: string;
}

interface CacheEntry {
  result: GeocodeResult;
  ts: number;
}

/** Simple LRU + localStorage cache for postcode/town lookups. */
class GeoCache {
  private mem = new Map<string, CacheEntry>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      const now = Date.now();
      for (const [k, v] of Object.entries(parsed)) {
        if (now - v.ts <= MAX_CACHE_AGE_MS) {
          this.mem.set(k, v);
        }
      }
      // Evict oldest if oversized
      while (this.mem.size > MEM_LIMIT) {
        const first = this.mem.keys().next().value;
        if (first !== undefined) this.mem.delete(first);
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private persist() {
    try {
      const obj = Object.fromEntries(this.mem.entries());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // ignore quota errors
    }
  }

  get(key: string): GeocodeResult | null {
    const entry = this.mem.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > MAX_CACHE_AGE_MS) {
      this.mem.delete(key);
      this.persist();
      return null;
    }
    // LRU touch — re-insert to end
    this.mem.delete(key);
    this.mem.set(key, entry);
    return entry.result;
  }

  set(key: string, result: GeocodeResult) {
    if (this.mem.size >= MEM_LIMIT) {
      const first = this.mem.keys().next().value;
      if (first !== undefined) this.mem.delete(first);
    }
    this.mem.set(key, { result, ts: Date.now() });
    this.persist();
  }
}

const cache = new GeoCache();

function normaliseKey(q: string): string {
  return q.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Geocode a UK postcode or town/place name to lat/lng. Cached for 7 days. */
export async function geocodeUK(query: string): Promise<GeocodeResult> {
  const q = query.trim();
  if (!q) throw new Error('Enter a postcode or town.');

  const key = normaliseKey(q);
  const cached = cache.get(key);
  if (cached) return cached;

  let result: GeocodeResult;

  // Full UK postcode → postcodes.io
  if (POSTCODE_RE.test(q)) {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      const r = json?.result;
      if (r?.latitude && r?.longitude) {
        result = {
          coords: { lat: r.latitude, lng: r.longitude },
          label: `${r.postcode}${r.admin_district ? ', ' + r.admin_district : ''}`,
        };
      } else {
        throw new Error('Postcode not found.');
      }
    } else {
      throw new Error('Postcode not found.');
    }
  } else if (PARTIAL_POSTCODE_RE.test(q)) {
    // Partial postcode (e.g. "SW1") → outcodes endpoint
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      const r = json?.result;
      if (r?.latitude && r?.longitude) {
        result = {
          coords: { lat: r.latitude, lng: r.longitude },
          label: `${r.outcode}${r.admin_district?.[0] ? ', ' + r.admin_district[0] : ''}`,
        };
      } else {
        throw new Error('Postcode area not found.');
      }
    } else {
      throw new Error('Postcode area not found.');
    }
  } else {
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
    result = {
      coords: { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) },
      label: hit.display_name.split(',').slice(0, 2).join(',').trim(),
    };
  }

  cache.set(key, result);
  return result;
}
