import { VENUE_COORDINATES } from './venueCoordinates';

const EARTH_RADIUS_MILES = 3958.7613;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance between two points in miles. */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return EARTH_RADIUS_MILES * c;
}

/** Look up a venue's coordinates by name (exact match against the curated list). */
export function getVenueCoords(venueName: string): LatLng | null {
  const v = VENUE_COORDINATES[venueName];
  return v ? { lat: v.lat, lng: v.lng } : null;
}
