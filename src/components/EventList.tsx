import { useMemo, useState } from 'react';
import { PaintballEvent } from '@/types/events';
import { EventCard } from './EventCard';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowDownUp, MapPin, Loader2, X, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserLocation } from '@/hooks/useUserLocation';
import { getVenueCoords, haversineMiles } from '@/lib/geo';
import { geocodeUK } from '@/lib/geocode';

interface EventListProps {
  events: PaintballEvent[];
  onEdit?: (event: PaintballEvent) => void;
}

type SortOption = 'distance-asc' | 'date-asc' | 'date-desc' | 'name-asc' | 'venue-asc';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200] as const;

export function EventList({ events, onEdit }: EventListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [showPast, setShowPast] = useState(false);
  const {
    coords,
    status: locStatus,
    error: locError,
    radiusMiles,
    source: locSource,
    label: locLabel,
    setRadiusMiles,
    request: requestLocation,
    setManualLocation,
    clear: clearLocation,
  } = useUserLocation(25);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeStatus, setPlaceStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [placeError, setPlaceError] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const radiusActive = !!coords;

  // Decorate events with distance (when location is set).
  const decorated = useMemo(() => {
    return events.map((event) => {
      if (!coords) return { event, distance: undefined as number | undefined, hasCoords: false };
      const venueCoords = getVenueCoords(event.venue_name);
      if (!venueCoords) return { event, distance: undefined, hasCoords: false };
      return { event, distance: haversineMiles(coords, venueCoords), hasCoords: true };
    });
  }, [events, coords]);

  const term = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return decorated.filter(({ event, distance, hasCoords }) => {
      const eventDate = parseISO(event.event_date);
      const isPast = isBefore(eventDate, today);
      if (!showPast && isPast) return false;

      if (radiusActive) {
        if (!hasCoords) return false;
        if ((distance ?? Infinity) > radiusMiles) return false;
      }

      if (!term) return true;
      const haystack = [event.title, event.venue_name, event.venue_location, event.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [decorated, term, showPast, today, radiusActive, radiusMiles]);

  const hiddenNoCoords = useMemo(() => {
    if (!radiusActive) return 0;
    return decorated.filter(({ event, hasCoords }) => {
      if (hasCoords) return false;
      const eventDate = parseISO(event.event_date);
      if (!showPast && isBefore(eventDate, today)) return false;
      return true;
    }).length;
  }, [decorated, radiusActive, showPast, today]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'distance-asc':
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        case 'date-asc':
          return (
            a.event.event_date.localeCompare(b.event.event_date) ||
            (a.event.start_time || '').localeCompare(b.event.start_time || '')
          );
        case 'date-desc':
          return (
            b.event.event_date.localeCompare(a.event.event_date) ||
            (b.event.start_time || '').localeCompare(a.event.start_time || '')
          );
        case 'name-asc':
          return a.event.title.localeCompare(b.event.title);
        case 'venue-asc':
          return a.event.venue_name.localeCompare(b.event.venue_name);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortBy]);

  const groupedByMonth = useMemo(() => {
    if (sortBy !== 'date-asc' && sortBy !== 'date-desc') {
      return { 'ALL EVENTS': sorted };
    }
    return sorted.reduce(
      (acc, item) => {
        const monthKey = format(parseISO(item.event.event_date), 'MMMM yyyy');
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(item);
        return acc;
      },
      {} as Record<string, typeof sorted>,
    );
  }, [sorted, sortBy]);

  const onRequestLocation = () => {
    requestLocation();
    // When the user opts in, default to nearest sort.
    setSortBy('distance-asc');
  };

  const onClearLocation = () => {
    clearLocation();
    setPlaceQuery('');
    setPlaceError(null);
    setPlaceStatus('idle');
    if (sortBy === 'distance-asc') setSortBy('date-asc');
  };

  const onSubmitPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = placeQuery.trim();
    if (!q) return;
    setPlaceStatus('loading');
    setPlaceError(null);
    try {
      const result = await geocodeUK(q);
      setManualLocation(result.coords, result.label);
      setSortBy('distance-asc');
      setPlaceStatus('idle');
    } catch (err) {
      setPlaceStatus('error');
      setPlaceError(err instanceof Error ? err.message : 'Could not find that location.');
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="font-display text-2xl text-foreground mb-2">NO EVENTS FOUND</h3>
        <p className="text-muted-foreground">Try adjusting your filters or check back later for new events.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events, venues, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border"
            aria-label="Search events"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[200px] bg-input border-border" aria-label="Sort by">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {radiusActive && <SelectItem value="distance-asc">Distance — nearest</SelectItem>}
              <SelectItem value="date-asc">Date — soonest</SelectItem>
              <SelectItem value="date-desc">Date — latest</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="venue-asc">Venue A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Near-me filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-card p-3">
        {!radiusActive ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onRequestLocation}
              disabled={locStatus === 'loading'}
              className="gap-2"
            >
              {locStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Use my location
            </Button>
            <span className="text-xs text-muted-foreground">
              Find walk-ons within a radius of where you are.
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              <MapPin className="h-3.5 w-3.5" />
              Within {radiusMiles} mi of you
            </span>
            <Select
              value={String(radiusMiles)}
              onValueChange={(v) => setRadiusMiles(Number(v))}
            >
              <SelectTrigger className="h-8 w-[120px] bg-input border-border" aria-label="Radius">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} miles
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={onClearLocation} className="h-8 gap-1 text-xs">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </>
        )}
        {locError && (
          <span className="w-full text-xs text-destructive sm:w-auto">{locError}</span>
        )}
      </div>

      {/* Past events toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPast((p) => !p)}
          className={cn(
            'text-sm transition-colors',
            showPast ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {showPast ? 'Hide past events' : 'Include past events'}
        </button>
      </div>

      {/* Results count */}
      {(sorted.length !== events.length || hiddenNoCoords > 0) && (
        <p className="text-xs text-muted-foreground">
          Showing {sorted.length} of {events.length} events
          {hiddenNoCoords > 0 && ` · ${hiddenNoCoords} hidden — venue location unknown`}
        </p>
      )}

      {/* Event list */}
      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="font-display text-2xl text-foreground mb-2">NO MATCHING EVENTS</h3>
          <p className="text-muted-foreground">
            {radiusActive
              ? `No events within ${radiusMiles} miles. Try a wider radius.`
              : 'Try a different search term or adjust your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([month, monthItems]) => (
            <div key={month}>
              <h2 className="font-display text-2xl text-accent mb-4 tracking-wide border-b border-border/50 pb-2">
                {month.toUpperCase()}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthItems.map(({ event, distance }) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={onEdit}
                    distanceMiles={distance}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
