import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { EventSourceBadge } from './EventSourceBadge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, ExternalLink, Pencil, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useIsAdmin } from '@/hooks/useAuth';
import { useFlaggedEventIds } from '@/hooks/useEventFlags';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: PaintballEvent;
  onEdit?: (event: PaintballEvent) => void;
}

export function EventCard({ event, onEdit }: EventCardProps) {
  const eventDate = parseISO(event.event_date);
  const { data: isAdmin } = useIsAdmin();
  const { data: flaggedIds } = useFlaggedEventIds();
  const isFlagged = flaggedIds?.has(event.id) ?? false;

  return (
    <Card className={cn(
      "card-hover overflow-hidden bg-card",
      event.is_verified ? "border-border/50" : "border-dashed border-muted-foreground/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <EventTypeBadge type={event.event_type} />
              {event.is_verified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60">
                  <ShieldAlert className="h-3 w-3" /> Unverified
                </span>
              )}
              <EventSourceBadge sourceUrl={event.source_url} compact />
            </div>
            <h3 className="font-display text-xl text-foreground truncate">{event.title}</h3>
          </div>
          {/* Only show edit button to admins */}
          {isAdmin && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-accent"
              onClick={() => onEdit(event)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isFlagged && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              Accuracy query raised — please verify details with the venue before booking.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-accent" />
          <span>{format(eventDate, 'EEEE, d MMMM yyyy')}</span>
        </div>

        {event.start_time && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-accent" />
            <span>
              {event.start_time.slice(0, 5)}
              {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-accent" />
          <span className="truncate">
            {event.venue_name}
            {event.venue_location && `, ${event.venue_location}`}
          </span>
        </div>

        {event.price_info && (
          <p className="text-sm font-medium text-primary">{event.price_info}</p>
        )}

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        {event.booking_url && (
          <Button
            variant="default"
            className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
            asChild
          >
            <a href={event.booking_url} target="_blank" rel="noopener noreferrer">
              Book Now
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}

        {!event.is_verified && (
          <p className="text-xs text-muted-foreground/50 italic">Dates & details may be approximate</p>
        )}
      </CardContent>
    </Card>
  );
}
