import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, ExternalLink, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useIsAdmin } from '@/hooks/useAuth';

interface EventCardProps {
  event: PaintballEvent;
  onEdit?: (event: PaintballEvent) => void;
}

export function EventCard({ event, onEdit }: EventCardProps) {
  const eventDate = parseISO(event.event_date);
  const { data: isAdmin } = useIsAdmin();

  return (
    <Card className="card-hover overflow-hidden bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <EventTypeBadge type={event.event_type} className="mb-2" />
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-accent" />
          <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
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
          <p className="text-xs text-muted-foreground/60 italic">Unverified - dates may be approximate</p>
        )}
      </CardContent>
    </Card>
  );
}
