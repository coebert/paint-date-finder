import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// UK venue coordinates - positions as percentages on the UK map image
// These are approximate positions for a 400x600 map of the UK
const VENUE_POSITIONS: Record<string, { top: number; left: number; region: string }> = {
  // South East
  'Campaign Paintball Park': { top: 78, left: 62, region: 'Surrey' },
  'CPG Paintball': { top: 77, left: 58, region: 'Surrey' },
  'Bedlam Paintball': { top: 80, left: 68, region: 'Kent' },
  // London area
  'Go Paintball London': { top: 75, left: 60, region: 'London' },
  // Essex
  'Mayhem Paintball': { top: 73, left: 65, region: 'Essex' },
  // Midlands
  'Delta Force Paintball Birmingham': { top: 58, left: 48, region: 'Birmingham' },
  'NPF Bassetts Pole': { top: 56, left: 50, region: 'West Midlands' },
  // East Midlands
  'Skirmish Paintball - Nottingham': { top: 52, left: 52, region: 'Nottingham' },
  // Yorkshire
  'The Gathering Paintball': { top: 42, left: 48, region: 'Huddersfield' },
  'Delta Force Paintball Leeds': { top: 40, left: 46, region: 'Leeds' },
  'Special Ops Paintball': { top: 38, left: 50, region: 'Leeds' },
  // Manchester
  'Bedlam Paintball - Manchester': { top: 45, left: 42, region: 'Manchester' },
  // Hampshire
  'Ground Zero Paintball': { top: 82, left: 48, region: 'Hampshire' },
};

interface EventMapProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

export function EventMap({ events, onEventClick }: EventMapProps) {
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

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

  const getGoogleMapsUrl = (venueName: string, location?: string | null) => {
    const query = location ? `${venueName}, ${location}` : `${venueName} UK`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const venueEntries = Object.entries(eventsByVenue);
  const mappedVenues = venueEntries.filter(([name]) => VENUE_POSITIONS[name]);
  const unmappedVenues = venueEntries.filter(([name]) => !VENUE_POSITIONS[name]);

  return (
    <div className="space-y-6">
      {/* Interactive UK Map */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="relative w-full" style={{ paddingBottom: '120%', maxHeight: '600px' }}>
          {/* UK Map Background */}
          <div 
            className="absolute inset-0 bg-secondary/30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'%3E%3Cpath d='M200 50 L220 80 L240 70 L250 100 L230 130 L250 160 L240 200 L260 220 L250 260 L270 280 L260 320 L280 360 L270 400 L290 430 L280 470 L300 500 L280 530 L260 520 L240 540 L220 530 L200 550 L180 540 L160 560 L140 540 L120 550 L100 530 L80 540 L60 520 L80 480 L60 450 L80 420 L60 380 L80 340 L60 300 L80 260 L60 220 L80 180 L100 200 L120 180 L140 200 L160 180 L180 160 L160 130 L180 100 L160 80 L180 60 L200 50Z' fill='%23374151' stroke='%234B5563' stroke-width='2'/%3E%3C/svg%3E")`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Venue Markers */}
            {mappedVenues.map(([venueName, venueEvents]) => {
              const pos = VENUE_POSITIONS[venueName];
              const isSelected = selectedVenue === venueName;
              
              return (
                <Tooltip key={venueName}>
                  <TooltipTrigger asChild>
                    <button
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 z-10 ${
                        isSelected ? 'z-20 scale-125' : 'hover:scale-110'
                      }`}
                      style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                      onClick={() => setSelectedVenue(isSelected ? null : venueName)}
                    >
                      <div className={`relative ${isSelected ? 'animate-pulse' : ''}`}>
                        <MapPin 
                          className={`h-8 w-8 drop-shadow-lg ${
                            isSelected 
                              ? 'text-primary fill-primary' 
                              : 'text-accent fill-accent hover:text-primary hover:fill-primary'
                          }`} 
                        />
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {venueEvents.length}
                        </span>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="font-semibold">{venueName}</p>
                    <p className="text-xs text-muted-foreground">{pos.region}</p>
                    <p className="text-xs">{venueEvents.length} event{venueEvents.length !== 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-border/50 bg-secondary/30">
          <p className="text-sm text-muted-foreground text-center">
            <MapPin className="inline h-4 w-4 text-accent mr-1" />
            Click markers to view venue details • {mappedVenues.length} venues shown
            {unmappedVenues.length > 0 && ` • ${unmappedVenues.length} additional venues below`}
          </p>
        </div>
      </div>

      {/* Selected Venue Detail Card */}
      {selectedVenue && eventsByVenue[selectedVenue] && (
        <Card className="bg-card border-accent border-2 animate-in slide-in-from-top-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-xl">{selectedVenue}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {VENUE_POSITIONS[selectedVenue]?.region || eventsByVenue[selectedVenue][0]?.venue_location}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a 
                    href={getGoogleMapsUrl(selectedVenue, eventsByVenue[selectedVenue][0]?.venue_location)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Directions
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVenue(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eventsByVenue[selectedVenue].map((event) => (
                <div
                  key={event.id}
                  className="p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => onEventClick?.(event)}
                >
                  <EventTypeBadge type={event.event_type} className="mb-2" />
                  <p className="font-medium">{event.title}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(event.event_date), 'EEE, MMM d, yyyy')}
                  </div>
                  {event.start_time && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {event.start_time.slice(0, 5)}
                    </div>
                  )}
                  {event.price_info && (
                    <p className="text-sm font-medium text-primary mt-1">{event.price_info}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Venue Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venueEntries.map(([venueName, venueEvents]) => {
          const pos = VENUE_POSITIONS[venueName];
          
          return (
            <Card 
              key={venueName} 
              className={`bg-card border-border/50 card-hover cursor-pointer transition-all ${
                selectedVenue === venueName ? 'ring-2 ring-accent' : ''
              }`}
              onClick={() => setSelectedVenue(selectedVenue === venueName ? null : venueName)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-lg truncate">{venueName}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{pos?.region || venueEvents[0]?.venue_location || 'UK'}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(getGoogleMapsUrl(venueName, venueEvents[0]?.venue_location), '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-accent font-medium mb-2">
                  {venueEvents.length} upcoming event{venueEvents.length !== 1 ? 's' : ''}
                </p>

                <div className="space-y-1">
                  {venueEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-sm">
                      <EventTypeBadge type={event.event_type} className="scale-75 origin-left" />
                      <span className="text-muted-foreground truncate">
                        {format(parseISO(event.event_date), 'MMM d')}
                      </span>
                    </div>
                  ))}
                  {venueEvents.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{venueEvents.length - 2} more
                    </p>
                  )}
                </div>
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
