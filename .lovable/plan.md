## Goal

Let visitors filter the events list to only events at venues within a chosen radius of their current location (5, 10, 25, 50, 100, 200 miles), and sort by distance.

## UX

In the events list toolbar, add a new control row:

```text
[ 📍 Use my location ]  [ Radius ▾ 25 mi ]   ✓ Within 25 mi of you · clear
```

- **Use my location** — primary button. On click, requests browser geolocation. While pending it shows a spinner; if denied/unavailable it shows a small inline error ("Location unavailable — check browser permissions").
- **Radius dropdown** — 5, 10, 25, 50, 100, 200 miles. Defaults to 25. Disabled until location is granted.
- **Active state pill** — shows current radius and a "clear" link that removes the filter.
- When the filter is active, sort defaults to "Distance — nearest" (a new sort option that only appears in this mode); existing sorts still work.
- Each `EventCard` in the list gets a small distance chip (e.g. `12 mi`) when a user location is set and the venue has known coordinates.
- Last used location + radius are remembered in `localStorage` so a return visit re-applies the filter without re-prompting (re-prompt only happens if the user clicks the button again to refresh).

## Behaviour rules

- Filtering uses the venue's coordinates from the existing `VENUE_COORDINATES` dictionary (currently inside `EventMap.tsx`).
- Events at venues **not** in that dictionary are excluded while the radius filter is active, and a small footer note shows the count: "3 events hidden — venue location unknown".
- Distance uses the Haversine formula in miles (British English UI, matches the rest of the site).
- No reverse geocoding, no map UI changes, no backend changes.

## Technical changes

1. **Extract venue coordinates to a shared module**
   - New file `src/lib/venueCoordinates.ts` exporting `VENUE_COORDINATES` and the `UKRegion` type.
   - `EventMap.tsx` imports from there instead of defining inline.

2. **Add geo helpers** in `src/lib/geo.ts`
   - `haversineMiles(a, b)` → number
   - `getVenueCoords(venueName)` → `{ lat, lng } | null`

3. **Add `useUserLocation` hook** in `src/hooks/useUserLocation.ts`
   - Wraps `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }`.
   - Returns `{ coords, status: 'idle'|'loading'|'granted'|'denied'|'error', error, request(), clear() }`.
   - Persists last successful coords + timestamp + chosen radius to `localStorage` under `faw:user-location`.

4. **Update `EventList.tsx`**
   - Add the toolbar controls described above.
   - When `coords && radius` are set, filter and (optionally) sort by computed distance.
   - Pass distance into each `EventCard`.

5. **Update `EventCard.tsx`**
   - New optional `distanceMiles?: number` prop. When present, render a small chip near the venue line: `12 mi away`.

## Edge cases handled

- HTTPS requirement: geolocation only works on https/localhost — preview and prod are both https, so fine.
- Permission denied: show inline message, leave radius dropdown disabled, don't crash.
- No venue coords: those events are simply excluded while filter is on, with a counter.
- Past events: existing "Include past events" toggle still applies on top of the radius filter.
