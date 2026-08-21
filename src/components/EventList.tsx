import { useEffect, useMemo, useState } from 'react';
import { PaintballEvent } from '@/types/events';
import { EventCard } from './EventCard';
import { EmptyState } from './EmptyState';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowDownUp, CalendarX, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haversineMiles, type LatLng } from '@/lib/geo';
import { useVenueGeo } from '@/hooks/useVenueGeo';


interface EventListProps {
  events: PaintballEvent[];
  onEdit?: (event: PaintballEvent) => void;
  userCoords?: LatLng | null;
}

type SortOption = 'distance-asc' | 'date-asc' | 'date-desc' | 'name-asc' | 'venue-asc';

export function EventList({ events, onEdit, userCoords }: EventListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [showPast, setShowPast] = useState(false);
  const resolveVenueCoords = useVenueGeo();

  const today = startOfDay(new Date());
  const hasUserCoords = !!userCoords;

  // Default to nearest sort when a user location is set; revert when cleared.
  useEffect(() => {
    if (hasUserCoords) {
      setSortBy((prev) => (prev === 'date-asc' ? 'distance-asc' : prev));
    } else {
      setSortBy((prev) => (prev === 'distance-asc' ? 'date-asc' : prev));
    }
  }, [hasUserCoords]);


  // Decorate events with distance (when location is set).
  const decorated = useMemo(() => {
    return events.map((event) => {
      if (!userCoords) return { event, distance: undefined as number | undefined };
      const venueCoords = resolveVenueCoords(event.venue_name);
      if (!venueCoords) return { event, distance: undefined };
      return { event, distance: haversineMiles(userCoords, venueCoords) };
    });
  }, [events, userCoords, resolveVenueCoords]);

  const term = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return decorated.filter(({ event }) => {
      const eventDate = parseISO(event.event_date);
      const isPast = isBefore(eventDate, today);
      if (!showPast && isPast) return false;

      if (!term) return true;
      const haystack = [event.title, event.venue_name, event.venue_location, event.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [decorated, term, showPast, today]);

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

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX className="h-7 w-7" aria-hidden />}
        title="No events found"
        description={
          hasUserCoords
            ? 'No events within the selected radius. Try a wider radius or clear the location filter.'
            : 'Try adjusting your filters or check back later for new events.'
        }
      />
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
              {hasUserCoords && <SelectItem value="distance-asc">Distance — nearest</SelectItem>}
              <SelectItem value="date-asc">Date — soonest</SelectItem>
              <SelectItem value="date-desc">Date — latest</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="venue-asc">Venue A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      {sorted.length !== events.length && (
        <p className="text-xs text-muted-foreground">
          Showing {sorted.length} of {events.length} events
        </p>
      )}

      {/* Event list */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-7 w-7" aria-hidden />}
          title="No matching events"
          description="Try a different search term or adjust your filters."
        />
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

