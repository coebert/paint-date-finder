import { format, parseISO } from 'date-fns';
import { AlertTriangle, Calendar, Clock, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import { PaintballEvent } from '@/types/events';
import { cn } from '@/lib/utils';
import { haversineMiles, type LatLng } from '@/lib/geo';
import { useVenueGeo } from '@/hooks/useVenueGeo';

interface ExpandedDayPanelProps {
  date: string;
  events: PaintballEvent[];
  flaggedIds: Set<string> | undefined;
  userCoords?: LatLng | null;
  onClose: () => void;
  onEventClick?: (event: PaintballEvent) => void;
}

export function ExpandedDayPanel({
  date,
  events,
  flaggedIds,
  userCoords,
  onClose,
  onEventClick,
}: ExpandedDayPanelProps) {
  const resolveVenueCoords = useVenueGeo();

  return (
    <div className="border-t border-border/50 bg-secondary/30 animate-in slide-in-from-top-2 duration-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg text-foreground">
              {format(parseISO(date), 'EEEE, d MMMM yyyy')}
            </h3>
            <span className="text-sm text-muted-foreground">
              ({events.length} event{events.length !== 1 ? 's' : ''})
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close day events"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className={cn(
                'p-3 bg-card rounded-lg border cursor-pointer hover:border-accent/50 transition-colors',
                event.is_verified ? 'border-border/50' : 'border-dashed border-muted-foreground/30',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <EventTypeBadge type={event.event_type} />
                  {flaggedIds?.has(event.id) && (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                </div>
                {event.is_verified ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="font-semibold text-foreground text-sm">{event.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {event.venue_name}
                {userCoords &&
                  (() => {
                    const vc = resolveVenueCoords(event.venue_name);
                    if (!vc) return null;
                    const d = Math.round(haversineMiles(userCoords, vc));
                    return <span className="text-accent"> · {d} mi away</span>;
                  })()}
              </p>
              {event.start_time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3 text-accent" />
                  {event.start_time.slice(0, 5)}
                  {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                </div>
              )}
              {event.price_info && (
                <p className="text-xs font-medium text-primary mt-2">{event.price_info}</p>
              )}
              {!event.is_verified && (
                <p className="text-[10px] text-muted-foreground italic mt-1">Unverified</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
