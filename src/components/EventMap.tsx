import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink, MapPin, Navigation, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';

// UK coordinates converted to percentage positions on a UK map
// Map bounds: roughly 49.9°N to 60.9°N latitude, -8.2°W to 1.8°E longitude
const UK_BOUNDS = {
  north: 60.9,
  south: 49.9,
  west: -8.2,
  east: 1.8,
};

// Real UK venue coordinates (lat, lng)
const VENUE_COORDINATES: Record<string, { lat: number; lng: number; region: string }> = {
  // South East
  'Campaign Paintball Park': { lat: 51.33, lng: -0.41, region: 'Cobham, Surrey' },
  'CPG Paintball': { lat: 51.38, lng: -0.52, region: 'Chertsey, Surrey' },
  'Bedlam Paintball': { lat: 51.15, lng: 0.87, region: 'Ashford, Kent' },
  // London area
  'Go Paintball London': { lat: 51.51, lng: -0.13, region: 'London' },
  // Essex
  'Mayhem Paintball': { lat: 51.65, lng: 0.10, region: 'Abridge, Essex' },
  // Midlands
  'Delta Force Paintball Birmingham': { lat: 52.49, lng: -1.89, region: 'Birmingham, West Midlands' },
  'NPF Bassetts Pole': { lat: 52.58, lng: -1.75, region: 'Sutton Coldfield, West Midlands' },
  // Nottingham
  'Skirmish Paintball - Nottingham': { lat: 52.95, lng: -1.16, region: 'Nottingham' },
  // Yorkshire
  'The Gathering Paintball': { lat: 53.65, lng: -1.78, region: 'Huddersfield, West Yorkshire' },
  'Delta Force Paintball Leeds': { lat: 53.80, lng: -1.55, region: 'Leeds, West Yorkshire' },
  'Special Ops Paintball': { lat: 53.75, lng: -1.60, region: 'Leeds' },
  // Manchester
  'Bedlam Paintball - Manchester': { lat: 53.48, lng: -2.24, region: 'Manchester' },
  // Hampshire
  'Ground Zero Paintball': { lat: 50.85, lng: -1.79, region: 'Ringwood, Hampshire' },
};

// Convert lat/lng to percentage position on map
function coordsToPosition(lat: number, lng: number): { top: number; left: number } {
  const top = ((UK_BOUNDS.north - lat) / (UK_BOUNDS.north - UK_BOUNDS.south)) * 100;
  const left = ((lng - UK_BOUNDS.west) / (UK_BOUNDS.east - UK_BOUNDS.west)) * 100;
  return { top: Math.max(5, Math.min(95, top)), left: Math.max(5, Math.min(95, left)) };
}

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
    const coords = VENUE_COORDINATES[venueName];
    if (coords) {
      return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    }
    const query = location ? `${venueName}, ${location}` : `${venueName} UK`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const venueEntries = Object.entries(eventsByVenue);
  
  // Get venues with known coordinates
  const mappedVenues = venueEntries.map(([name, events]) => {
    const coords = VENUE_COORDINATES[name];
    if (coords) {
      return { name, events, coords, position: coordsToPosition(coords.lat, coords.lng) };
    }
    return null;
  }).filter(Boolean) as Array<{ name: string; events: PaintballEvent[]; coords: { lat: number; lng: number; region: string }; position: { top: number; left: number } }>;

  const handleMarkerClick = (venueName: string) => {
    setSelectedVenue(selectedVenue === venueName ? null : venueName);
  };

  return (
    <div className="space-y-6">
      {/* UK Map Container */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="relative w-full bg-[#1e3a5f]" style={{ height: '500px' }}>
          {/* UK Map SVG - Accurate outline */}
          <svg
            viewBox="0 0 400 550"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Sea background */}
            <rect width="400" height="550" fill="#1e3a5f" />
            
            {/* Scotland */}
            <path
              d="M180 20 L200 15 L220 25 L240 20 L255 35 L270 30 L280 50 L275 70 L290 85 L280 100 L295 115 L285 130 L270 125 L260 140 L245 135 L235 150 L220 145 L210 160 L195 155 L185 165 L175 155 L165 165 L155 155 L145 160 L140 145 L130 150 L125 135 L115 140 L120 120 L110 110 L125 95 L115 80 L130 70 L125 55 L140 45 L135 35 L150 30 L160 40 L175 30 L180 20Z"
              fill="#2d4a3e"
              stroke="#3d5a4e"
              strokeWidth="1"
            />
            
            {/* Northern England & Wales */}
            <path
              d="M155 155 L175 155 L185 165 L195 155 L210 160 L220 145 L235 150 L245 160 L260 155 L270 165 L280 160 L290 175 L285 195 L295 210 L290 230 L280 245 L290 260 L285 280 L275 295 L285 310 L275 325 L265 340 L275 355 L265 375 L250 370 L240 385 L225 375 L215 390 L200 385 L190 400 L175 395 L165 410 L150 400 L140 385 L125 390 L115 375 L100 380 L95 360 L105 345 L95 325 L110 310 L100 290 L115 275 L105 255 L120 240 L110 220 L125 205 L115 185 L130 170 L145 175 L155 155Z"
              fill="#2d4a3e"
              stroke="#3d5a4e"
              strokeWidth="1"
            />
            
            {/* Southern England */}
            <path
              d="M165 410 L175 395 L190 400 L200 385 L215 390 L225 375 L240 385 L250 370 L265 375 L275 385 L290 380 L305 395 L315 390 L330 405 L340 400 L355 420 L350 440 L365 455 L355 475 L340 470 L330 485 L315 475 L300 490 L285 480 L270 495 L255 485 L240 500 L225 490 L210 505 L195 495 L180 510 L165 495 L150 505 L135 490 L120 500 L110 485 L95 490 L90 470 L100 455 L90 435 L105 420 L115 430 L130 415 L145 425 L165 410Z"
              fill="#2d4a3e"
              stroke="#3d5a4e"
              strokeWidth="1"
            />
            
            {/* Ireland (partial - just for context) */}
            <path
              d="M30 200 L50 190 L70 200 L85 195 L95 215 L90 240 L100 260 L90 285 L75 295 L60 285 L45 300 L30 290 L20 270 L25 245 L15 225 L30 200Z"
              fill="#2d4a3e"
              stroke="#3d5a4e"
              strokeWidth="1"
              opacity="0.5"
            />
            
            {/* Grid lines for reference */}
            <g stroke="#ffffff" strokeWidth="0.3" opacity="0.1">
              {[100, 200, 300, 400].map(y => (
                <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} />
              ))}
              {[100, 200, 300].map(x => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2="550" />
              ))}
            </g>
          </svg>

          {/* Venue Markers */}
          {mappedVenues.map(({ name, events: venueEvents, position }) => {
            const isSelected = selectedVenue === name;
            
            return (
              <button
                key={name}
                className={`absolute transform -translate-x-1/2 -translate-y-full transition-all duration-200 group ${
                  isSelected ? 'z-30 scale-110' : 'z-20 hover:z-25 hover:scale-105'
                }`}
                style={{ top: `${position.top}%`, left: `${position.left}%` }}
                onClick={() => handleMarkerClick(name)}
                title={`${name} - ${venueEvents.length} event${venueEvents.length !== 1 ? 's' : ''}`}
              >
                {/* Marker pin */}
                <div className="relative">
                  <svg 
                    width="32" 
                    height="40" 
                    viewBox="0 0 32 40" 
                    className={`drop-shadow-lg transition-colors ${
                      isSelected ? 'text-primary' : 'text-accent group-hover:text-primary'
                    }`}
                  >
                    <path
                      d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z"
                      fill="currentColor"
                    />
                    <circle cx="16" cy="14" r="6" fill="white" />
                  </svg>
                  
                  {/* Event count badge */}
                  <span className={`absolute -top-1 -right-1 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                    isSelected ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                  }`}>
                    {venueEvents.length}
                  </span>
                </div>
                
                {/* Venue name tooltip on hover */}
                <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-card text-foreground text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                  isSelected ? 'opacity-100' : ''
                }`}>
                  {name}
                </div>
              </button>
            );
          })}

          {/* Map Labels */}
          <div className="absolute top-4 left-4 text-white/60 text-xs font-medium">
            SCOTLAND
          </div>
          <div className="absolute top-[35%] left-[25%] text-white/60 text-xs font-medium">
            NORTHERN<br/>ENGLAND
          </div>
          <div className="absolute top-[55%] left-[15%] text-white/60 text-xs font-medium">
            WALES
          </div>
          <div className="absolute top-[65%] left-[55%] text-white/60 text-xs font-medium">
            ENGLAND
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-border/50 bg-secondary/30 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            <MapPin className="inline h-4 w-4 text-accent mr-1" />
            Click a marker to view events at that venue
          </p>
          <p className="text-sm text-muted-foreground">
            {mappedVenues.length} venues • {events.length} events
          </p>
        </div>
      </div>

      {/* Selected Venue Events Panel */}
      {selectedVenue && eventsByVenue[selectedVenue] && (
        <Card className="bg-card border-accent border-2 animate-in slide-in-from-top-2 duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-2xl text-foreground">{selectedVenue}</h3>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {VENUE_COORDINATES[selectedVenue]?.region || eventsByVenue[selectedVenue][0]?.venue_location || 'United Kingdom'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  asChild
                >
                  <a 
                    href={getGoogleMapsUrl(selectedVenue, eventsByVenue[selectedVenue][0]?.venue_location)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Get Directions
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedVenue(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {eventsByVenue[selectedVenue].length} UPCOMING EVENT{eventsByVenue[selectedVenue].length !== 1 ? 'S' : ''}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventsByVenue[selectedVenue].map((event) => (
                <div
                  key={event.id}
                  className="p-4 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary transition-colors border border-transparent hover:border-accent/50"
                  onClick={() => onEventClick?.(event)}
                >
                  <EventTypeBadge type={event.event_type} className="mb-2" />
                  <p className="font-semibold text-foreground">{event.title}</p>
                  
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-accent" />
                      {format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')}
                    </div>
                    {event.start_time && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-accent" />
                        {event.start_time.slice(0, 5)}
                        {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                      </div>
                    )}
                  </div>
                  
                  {event.price_info && (
                    <p className="text-sm font-medium text-primary mt-3">{event.price_info}</p>
                  )}
                  
                  {event.booking_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={event.booking_url} target="_blank" rel="noopener noreferrer">
                        Book Now
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Venues Grid */}
      <div>
        <h3 className="font-display text-xl mb-4 text-foreground">All Venues</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venueEntries.map(([venueName, venueEvents]) => {
            const coords = VENUE_COORDINATES[venueName];
            
            return (
              <Card 
                key={venueName} 
                className={`bg-card border-border/50 cursor-pointer transition-all hover:border-accent/50 ${
                  selectedVenue === venueName ? 'ring-2 ring-accent border-accent' : ''
                }`}
                onClick={() => handleMarkerClick(venueName)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{venueName}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{coords?.region || venueEvents[0]?.venue_location || 'UK'}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getGoogleMapsUrl(venueName, venueEvents[0]?.venue_location), '_blank');
                      }}
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-sm text-accent font-medium">
                    {venueEvents.length} event{venueEvents.length !== 1 ? 's' : ''}
                  </p>

                  <div className="mt-2 space-y-1">
                    {venueEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{event.title}</span>
                        <span className="shrink-0">• {format(parseISO(event.event_date), 'MMM d')}</span>
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
