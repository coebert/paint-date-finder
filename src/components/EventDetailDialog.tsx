import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, ExternalLink, Pencil, CheckCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useIsAdmin } from '@/hooks/useAuth';

interface EventDetailDialogProps {
  event: PaintballEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: PaintballEvent) => void;
}

export function EventDetailDialog({ event, open, onOpenChange, onEdit }: EventDetailDialogProps) {
  const { data: isAdmin } = useIsAdmin();
  
  if (!event) return null;

  const eventDate = parseISO(event.event_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border" aria-describedby="event-dialog-description">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <EventTypeBadge type={event.event_type} className="mb-2" />
              <DialogTitle className="font-display text-2xl tracking-wide pr-8">
                {event.title}
              </DialogTitle>
              <DialogDescription id="event-dialog-description" className="sr-only">
                Event details for {event.title} at {event.venue_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-accent" />
            <span className="font-medium">{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>

          {event.start_time && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5 text-accent" />
              <span>
                {event.start_time.slice(0, 5)}
                {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-5 w-5 text-accent" />
              <span>
                {event.venue_name}
                {event.venue_location && `, ${event.venue_location}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-primary hover:text-primary/80 gap-1"
              asChild
            >
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_name + (event.venue_location ? ', ' + event.venue_location : ''))}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MapPin className="h-4 w-4" />
                View on Map
              </a>
            </Button>
          </div>

          {event.price_info && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <p className="text-primary font-semibold">{event.price_info}</p>
            </div>
          )}

          {event.description && (
            <div>
              <h4 className="font-semibold text-foreground mb-1">Description</h4>
              <p className="text-muted-foreground text-sm">{event.description}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            {event.is_verified ? (
              <>
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-primary">Verified Event</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-accent" />
                <span className="text-accent">Unverified - dates may be approximate</span>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            {event.booking_url && (
              <Button
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                asChild
              >
                <a href={event.booking_url} target="_blank" rel="noopener noreferrer">
                  Book Now
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {/* Only show edit button to admins */}
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(event);
                }}
                className="border-border gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
