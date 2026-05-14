import type { LatLng } from './geo';

// UK postcode: loose match (full or partial outward+inward).
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const PARTIAL_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;
// Anything that *starts* postcode-shaped (used to route fuzzy lookups).
const POSTCODE_LIKE_RE = /^[A-Z]{1,2}\d/i;

const STORAGE_KEY = 'faw:geocode-cache';
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MEM_LIMIT = 200; // in-memory LRU entries

export interface GeocodeResult {
  coords: LatLng;
  label: string;
}

export class GeocodeError extends Error {
  suggestions: string[];
  constructor(message: string, suggestions: string[] = []) {
    super(message);
    this.name = 'GeocodeError';
    this.suggestions = suggestions;
  }
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
        if (now - v.ts <= MAX_CACHE_AGE_MS) this.mem.set(k, v);
      }
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

/** Ask postcodes.io for autocomplete suggestions for a postcode-like string. */
async function postcodeSuggestions(q: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(q)}/autocomplete`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.result) ? json.result.slice(0, 5) : [];
  } catch {
    return [];
  }
}

/** Ask Nominatim for up to 5 alternative UK matches. */
async function placeSuggestions(q: string): Promise<string[]> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('countrycodes', 'gb');
    url.searchParams.set('limit', '5');
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const arr = (await res.json()) as Array<{ display_name: string }>;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const hit of arr) {
      const short = hit.display_name.split(',').slice(0, 2).join(',').trim();
      if (!seen.has(short.toLowerCase())) {
        seen.add(short.toLowerCase());
        out.push(short);
      }
    }
    return out.slice(0, 5);
  } catch {
    return [];
  }
}

/** Geocode a UK postcode or town/place name to lat/lng. Cached for 7 days. */
export async function geocodeUK(query: string): Promise<GeocodeResult> {
  const q = query.trim();
  if (!q) throw new GeocodeError('Enter a postcode or town.');
  if (q.length < 2) {
    throw new GeocodeError('Enter at least 2 characters.');
  }

  const key = normaliseKey(q);
  const cached = cache.get(key);
  if (cached) return cached;

  let result: GeocodeResult | null = null;

  // Full UK postcode → postcodes.io
  if (POSTCODE_RE.test(q)) {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q)}`);
    if (res.ok) {
      const r = (await res.json())?.result;
      if (r?.latitude && r?.longitude) {
        result = {
          coords: { lat: r.latitude, lng: r.longitude },
          label: `${r.postcode}${r.admin_district ? ', ' + r.admin_district : ''}`,
        };
      }
    }
    if (!result) {
      const suggestions = await postcodeSuggestions(q);
      throw new GeocodeError(
        suggestions.length
          ? `"${q.toUpperCase()}" isn't a valid UK postcode. Did you mean one of these?`
          : `"${q.toUpperCase()}" isn't a valid UK postcode.`,
        suggestions,
      );
    }
  } else if (PARTIAL_POSTCODE_RE.test(q)) {
    // Partial postcode (e.g. "SW1") → outcodes endpoint
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(q)}`);
    if (res.ok) {
      const r = (await res.json())?.result;
      if (r?.latitude && r?.longitude) {
        result = {
          coords: { lat: r.latitude, lng: r.longitude },
          label: `${r.outcode}${r.admin_district?.[0] ? ', ' + r.admin_district[0] : ''}`,
        };
      }
    }
    if (!result) {
      const suggestions = await postcodeSuggestions(q);
      throw new GeocodeError(
        suggestions.length
          ? `Postcode area "${q.toUpperCase()}" not found. Did you mean one of these?`
          : `Postcode area "${q.toUpperCase()}" not found.`,
        suggestions,
      );
    }
  } else if (POSTCODE_LIKE_RE.test(q) && /\d/.test(q)) {
    // Looks like a malformed postcode (e.g. "SW1A1A", "B1 4Q") — try autocomplete first.
    const suggestions = await postcodeSuggestions(q);
    if (suggestions.length === 1) {
      // Recursively resolve the single confident suggestion.
      return geocodeUK(suggestions[0]);
    }
    throw new GeocodeError(
      suggestions.length
        ? `"${q.toUpperCase()}" looks like an incomplete postcode. Did you mean one of these?`
        : `"${q.toUpperCase()}" doesn't look like a valid UK postcode.`,
      suggestions,
    );
  } else {
    // Town / place name → Nominatim (UK-bounded), fetch a few for fallback suggestions.
    const matches = await placeSuggestions(q);
    if (matches.length === 0) {
      throw new GeocodeError(
        `No matching place found in the UK for "${q}". Check the spelling or try a nearby town.`,
      );
    }
    // Look up the top hit's coords.
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', matches[0]);
    url.searchParams.set('format', 'json');
    url.searchParams.set('countrycodes', 'gb');
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new GeocodeError('Location lookup failed. Please try again.', matches.slice(1));
    }
    const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!arr.length) {
      throw new GeocodeError(
        `Couldn't pinpoint "${q}". Try one of these instead:`,
        matches.slice(1),
      );
    }
    const hit = arr[0];
    result = {
      coords: { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) },
      label: matches[0],
    };
  }

  cache.set(key, result);
  return result;
}
