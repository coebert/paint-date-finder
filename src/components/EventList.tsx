import { useState, useMemo } from 'react';
import { PaintballEvent } from '@/types/events';
import { EventCard } from './EventCard';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventListProps {
  events: PaintballEvent[];
  onEdit?: (event: PaintballEvent) => void;
}

type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'venue-asc';

export function EventList({ events, onEdit }: EventListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [showPast, setShowPast] = useState(false);

  const today = startOfDay(new Date());

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = events.filter((event) => {
      const eventDate = parseISO(event.event_date);
      const isPast = isBefore(eventDate, today);
      if (!showPast && isPast) return false;

      if (!term) return true;
      const haystack = [
        event.title,
        event.venue_name,
        event.venue_location,
        event.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });

    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return a.event_date.localeCompare(b.event_date) || (a.start_time || '').localeCompare(b.start_time || '');
        case 'date-desc':
          return b.event_date.localeCompare(a.event_date) || (b.start_time || '').localeCompare(a.start_time || '');
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'venue-asc':
          return a.venue_name.localeCompare(b.venue_name);
        default:
          return 0;
      }
    });

    return result;
  }, [events, search, sortBy, showPast, today]);

  const eventsByMonth = useMemo(() => {
    if (sortBy !== 'date-asc' && sortBy !== 'date-desc') {
      return { 'ALL EVENTS': filteredAndSorted };
    }

    return filteredAndSorted.reduce((acc, event) => {
      const monthKey = format(parseISO(event.event_date), 'MMMM yyyy');
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(event);
      return acc;
    }, {} as Record<string, PaintballEvent[]>);
  }, [filteredAndSorted, sortBy]);

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="font-display text-2xl text-foreground mb-2">NO EVENTS FOUND</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or check back later for new events.
        </p>
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
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-[180px] bg-input border-border" aria-label="Sort by">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
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
            showPast ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {showPast ? 'Hide past events' : 'Include past events'}
        </button>
      </div>

      {/* Results count */}
      {filteredAndSorted.length !== events.length && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredAndSorted.length} of {events.length} events
        </p>
      )}

      {/* Event list */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="font-display text-2xl text-foreground mb-2">NO MATCHING EVENTS</h3>
          <p className="text-muted-foreground">
            Try a different search term or adjust your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
            <div key={month}>
              <h2 className="font-display text-2xl text-accent mb-4 tracking-wide border-b border-border/50 pb-2">
                {month.toUpperCase()}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthEvents.map((event) => (
                  <EventCard key={event.id} event={event} onEdit={onEdit} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
