import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

// UK venue coordinates for map links
const VENUE_COORDINATES: Record<string, { lat: number; lng: number; address?: string }> = {
  'Delta Force Paintball - Cobham': { lat: 51.3297, lng: -0.4069, address: 'Cobham, Surrey' },
  'Mayhem Paintball': { lat: 51.7074, lng: 0.2619, address: 'Abridge, Essex' },
  'Campaign Paintball': { lat: 52.7707, lng: -1.2078, address: 'Leicestershire' },
  'National Paintball Fields - Birmingham': { lat: 52.4862, lng: -1.8904, address: 'Birmingham' },
  'Bedlam Paintball - Manchester': { lat: 53.4808, lng: -2.2426, address: 'Manchester' },
  'Special Ops Paintball': { lat: 53.8008, lng: -1.5491, address: 'Leeds' },
  'Skirmish Paintball - Nottingham': { lat: 52.9548, lng: -1.1581, address: 'Nottingham' },
  'Go Paintball London': { lat: 51.5074, lng: -0.1278, address: 'London' },
};

interface EventMapProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

export function EventMap({ events, onEventClick }: EventMapProps) {
  // Group events by venue
  const eventsByVenue = useMemo(() => {
    return events.reduce((acc, event) => {
      const key = event.venue_name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(event);
      return acc;
    }, {} as Record<string, PaintballEvent[]>);
  }, [events]);

  const getGoogleMapsUrl = (venueName: string) => {
    const coords = VENUE_COORDINATES[venueName];
    if (coords) {
      return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName + ' UK')}`;
  };

  const venueEntries = Object.entries(eventsByVenue);

  return (
    <div className="space-y-6">
      {/* Embedded Map */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <iframe
          title="UK Paintball Venues Map"
          width="100%"
          height="400"
          style={{ border: 0 }}
          loading="lazy"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4940340.3659073!2d-6.0!3d54.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x25a3b1142c791a9%3A0xc4f8a0433288257a!2sUnited%20Kingdom!5e0!3m2!1sen!2sus!4v1600000000000"
          allowFullScreen
        />
      </div>

      {/* Venue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venueEntries.map(([venueName, venueEvents]) => {
          const coords = VENUE_COORDINATES[venueName];
          
          return (
            <Card key={venueName} className="bg-card border-border/50 card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-display truncate">{venueName}</CardTitle>
                    {coords?.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {coords.address}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    asChild
                  >
                    <a href={getGoogleMapsUrl(venueName)} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-accent font-medium">
                  {venueEvents.length} upcoming event{venueEvents.length !== 1 ? 's' : ''}
                </p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {venueEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="p-2 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                      onClick={() => onEventClick?.(event)}
                    >
                      <EventTypeBadge type={event.event_type} className="mb-1" />
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(event.event_date), 'MMM d, yyyy')}
                      </div>
                      {event.start_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {event.start_time.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {venueEvents.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{venueEvents.length - 3} more events
                  </p>
                )}
                
                {venueEvents[0]?.booking_url && (
                  <Button
                    size="sm"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    asChild
                  >
                    <a href={venueEvents[0].booking_url} target="_blank" rel="noopener noreferrer">
                      Visit Venue Website
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {venueEntries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No venues found with the current filters</p>
        </div>
      )}
    </div>
  );
}
