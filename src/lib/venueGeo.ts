import { VENUE_COORDINATES, type VenueCoord } from './venueCoordinates';
import type { LatLng } from './geo';

/**
 * Venue names arrive from scrapers, flyers and manual submissions, so exact
 * string matching against the curated coordinate list misses a lot ("Combat
 * Paintball Limited", "NPF Bassetts Pole Adventure Park", "Outpost Paintball
 * and Airsoft"). Normalise before matching, and fall back to prefix matching.
 */
export function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(ltd|limited|llp|plc|uk|the)\b/g, ' ')
    .replace(/\b(paintball|airsoft|centre|center|park|fields?|adventure|activities|activity|events?|office|site|hq)\b/g, ' $1 ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Tokens that carry no identifying weight when comparing venue names. */
const WEAK_TOKENS = new Set([
  'paintball',
  'airsoft',
  'centre',
  'center',
  'park',
  'field',
  'fields',
  'adventure',
  'activities',
  'activity',
  'events',
  'event',
  'office',
  'site',
  'leisure',
  'sports',
  'and',
]);

function strongTokens(normalized: string): string[] {
  return normalized.split(' ').filter((t) => t && !WEAK_TOKENS.has(t));
}

const NORMALIZED_STATIC = new Map<string, VenueCoord>(
  Object.entries(VENUE_COORDINATES).map(([name, coord]) => [normalizeVenueName(name), coord]),
);

export type VenueCoordSource = 'database' | 'curated' | 'fuzzy';

export interface ResolvedVenueCoord extends LatLng {
  source: VenueCoordSource;
}

export interface DbVenueCoord {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Resolve coordinates for a venue name, preferring live database coordinates
 * (admin/scraper managed) and falling back to the curated list, then to a
 * fuzzy match on the identifying tokens of the name.
 */
export function resolveVenueCoords(
  venueName: string,
  dbVenues?: Iterable<DbVenueCoord>,
): ResolvedVenueCoord | null {
  if (!venueName) return null;
  const normalized = normalizeVenueName(venueName);
  const tokens = strongTokens(normalized);

  // 1. Exact / normalized match against database coordinates.
  if (dbVenues) {
    let fuzzyDb: ResolvedVenueCoord | null = null;
    for (const v of dbVenues) {
      if (v.latitude == null || v.longitude == null) continue;
      const vNorm = normalizeVenueName(v.name);
      if (vNorm === normalized) {
        return { lat: v.latitude, lng: v.longitude, source: 'database' };
      }
      if (!fuzzyDb && tokensMatch(tokens, strongTokens(vNorm))) {
        fuzzyDb = { lat: v.latitude, lng: v.longitude, source: 'database' };
      }
    }
    if (fuzzyDb) return fuzzyDb;
  }

  // 2. Curated list, exact then normalized.
  const exact = VENUE_COORDINATES[venueName];
  if (exact) return { lat: exact.lat, lng: exact.lng, source: 'curated' };

  const norm = NORMALIZED_STATIC.get(normalized);
  if (norm) return { lat: norm.lat, lng: norm.lng, source: 'curated' };

  // 3. Fuzzy: all identifying tokens of one name contained in the other.
  for (const [candidate, coord] of NORMALIZED_STATIC) {
    if (tokensMatch(tokens, strongTokens(candidate))) {
      return { lat: coord.lat, lng: coord.lng, source: 'fuzzy' };
    }
  }

  return null;
}

function tokensMatch(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.every((t) => longer.includes(t));
}
