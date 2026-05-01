import { useState, useMemo } from 'react';
import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { FlagEventDialog } from './FlagEventDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, ExternalLink, Globe, Pencil, CheckCircle, AlertCircle, Flag, AlertTriangle, Undo2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { useIsAdmin } from '@/hooks/useAuth';
import { useFlaggedEventIds, useWithdrawFlag, getStoredFlagForEvent } from '@/hooks/useEventFlags';
import { EventSourceBadge } from './EventSourceBadge';

interface EventDetailDialogProps {
  event: PaintballEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: PaintballEvent) => void;
}

export function EventDetailDialog({ event, open, onOpenChange, onEdit }: EventDetailDialogProps) {
  const { data: venueDetails } = useVenueDetails();
  const { data: isAdmin } = useIsAdmin();
  const { data: flaggedIds } = useFlaggedEventIds();
  const withdrawFlag = useWithdrawFlag();
  const [flagOpen, setFlagOpen] = useState(false);
  
  if (!event) return null;

  const isFlagged = flaggedIds?.has(event.id) ?? false;
  const storedFlag = getStoredFlagForEvent(event.id);

  const eventDate = parseISO(event.event_date);
  const venueWebsite = venueDetails?.get(event.venue_name)?.website ?? null;

  const handleWithdraw = () => {
    if (!storedFlag) return;
    withdrawFlag.mutate({
      eventId: event.id,
      flagId: storedFlag.flagId,
      deleteToken: storedFlag.deleteToken,
    });
  };

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
          {isFlagged && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">Accuracy Query Raised</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  A concern has been raised about the accuracy of this event's information. 
                  Details such as the date, venue, or status may be incorrect. Please verify 
                  with the venue directly before booking.
                </p>
                {storedFlag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleWithdraw}
                    disabled={withdrawFlag.isPending}
                    className="mt-2 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 px-2"
                  >
                    {withdrawFlag.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Undo2 className="h-3 w-3" />
                    )}
                    Withdraw my report
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-accent" />
            <span className="font-medium">{format(eventDate, 'EEEE, d MMMM yyyy')}</span>
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

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5 text-accent" />
            <span>
              {event.venue_name}
              {event.venue_location && `, ${event.venue_location}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 gap-1"
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
            {venueWebsite && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80 gap-1"
                asChild
              >
                <a href={venueWebsite} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>
              </Button>
            )}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFlagOpen(true)}
              className="text-muted-foreground hover:text-destructive gap-1"
            >
              <Flag className="h-4 w-4" />
              Report
            </Button>
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

        <FlagEventDialog
          eventId={event.id}
          eventTitle={event.title}
          open={flagOpen}
          onOpenChange={setFlagOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
