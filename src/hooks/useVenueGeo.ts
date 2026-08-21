import { useCallback } from 'react';
import { useVenueDetails } from './useVenueDetails';
import { resolveVenueCoords, type ResolvedVenueCoord } from '@/lib/venueGeo';

/**
 * Returns a resolver that maps a venue name to coordinates, using live
 * database coordinates first and the curated list as a fallback.
 */
export function useVenueGeo() {
  const { data: venueDetails } = useVenueDetails();

  const resolve = useCallback(
    (venueName: string): ResolvedVenueCoord | null =>
      resolveVenueCoords(
        venueName,
        venueDetails
          ? Array.from(venueDetails.values()).map((v) => ({
              name: v.name,
              latitude: v.latitude,
              longitude: v.longitude,
            }))
          : undefined,
      ),
    [venueDetails],
  );

  return resolve;
}
