import { PaintballEvent } from '@/types/events';
import { EventCard } from './EventCard';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

interface EventListProps {
  events: PaintballEvent[];
  onEdit?: (event: PaintballEvent) => void;
}

export function EventList({ events, onEdit }: EventListProps) {
  const today = startOfDay(new Date());
  
  // Filter out past events and group by month
  const upcomingEvents = events.filter((event) => {
    const eventDate = parseISO(event.event_date);
    return !isBefore(eventDate, today);
  });

  const eventsByMonth = upcomingEvents.reduce((acc, event) => {
    const monthKey = format(parseISO(event.event_date), 'MMMM yyyy');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, PaintballEvent[]>);

  if (upcomingEvents.length === 0) {
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
  );
}
