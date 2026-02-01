import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, Clock, ExternalLink, MapPin, Navigation, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';

// Region definitions for filtering
export type UKRegion = 'all' | 'scotland' | 'north' | 'midlands' | 'south' | 'wales';

const REGION_LABELS: Record<UKRegion, string> = {
  all: 'All UK',
  scotland: 'Scotland',
  north: 'North',
  midlands: 'Midlands',
  south: 'South',
  wales: 'Wales',
};

// UK coordinates converted to percentage positions on a UK map
const UK_BOUNDS = {
  north: 60.9,
  south: 49.9,
  west: -8.2,
  east: 1.8,
};

// Real UK venue coordinates with standardized region
const VENUE_COORDINATES: Record<string, { lat: number; lng: number; location: string; region: UKRegion }> = {
  // South
  'Campaign Paintball Park': { lat: 51.33, lng: -0.41, location: 'Cobham, Surrey', region: 'south' },
  'CPG Paintball': { lat: 51.38, lng: -0.52, location: 'Chertsey, Surrey', region: 'south' },
  'Bedlam Paintball': { lat: 51.15, lng: 0.87, location: 'Ashford, Kent', region: 'south' },
  'Go Paintball London': { lat: 51.51, lng: -0.13, location: 'London', region: 'south' },
  'Mayhem Paintball': { lat: 51.65, lng: 0.10, location: 'Abridge, Essex', region: 'south' },
  'Ground Zero Paintball': { lat: 50.85, lng: -1.79, location: 'Ringwood, Hampshire', region: 'south' },
  // Midlands
  'Delta Force Paintball Birmingham': { lat: 52.49, lng: -1.89, location: 'Birmingham, West Midlands', region: 'midlands' },
  'NPF Bassetts Pole': { lat: 52.58, lng: -1.75, location: 'Sutton Coldfield, West Midlands', region: 'midlands' },
  'Skirmish Paintball - Nottingham': { lat: 52.95, lng: -1.16, location: 'Nottingham', region: 'midlands' },
  // North
  'The Gathering Paintball': { lat: 53.65, lng: -1.78, location: 'Huddersfield, West Yorkshire', region: 'north' },
  'Delta Force Paintball Leeds': { lat: 53.80, lng: -1.55, location: 'Leeds, West Yorkshire', region: 'north' },
  'Special Ops Paintball': { lat: 53.75, lng: -1.60, location: 'Leeds', region: 'north' },
  'Bedlam Paintball - Manchester': { lat: 53.48, lng: -2.24, location: 'Manchester', region: 'north' },
  // Scotland
  'Bedlam Paintball - Edinburgh': { lat: 55.95, lng: -3.19, location: 'Edinburgh', region: 'scotland' },
  'Bedlam Paintball - Glasgow': { lat: 55.86, lng: -4.25, location: 'Glasgow', region: 'scotland' },
  // Wales
  'Delta Force Paintball Cardiff': { lat: 51.48, lng: -3.18, location: 'Cardiff', region: 'wales' },
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
  const [selectedRegion, setSelectedRegion] = useState<UKRegion>('all');

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
  
  // Get venues with known coordinates, filtered by region
  const mappedVenues = venueEntries.map(([name, venueEvents]) => {
    const coords = VENUE_COORDINATES[name];
    if (coords) {
      return { name, events: venueEvents, coords, position: coordsToPosition(coords.lat, coords.lng) };
    }
    return null;
  }).filter((v): v is NonNullable<typeof v> => {
    if (!v) return false;
    if (selectedRegion === 'all') return true;
    return v.coords.region === selectedRegion;
  });

  // Filter venue entries by region for the grid
  const filteredVenueEntries = venueEntries.filter(([name]) => {
    if (selectedRegion === 'all') return true;
    const coords = VENUE_COORDINATES[name];
    return coords?.region === selectedRegion;
  });

  // Count events in filtered venues
  const filteredEventCount = filteredVenueEntries.reduce((sum, [, venueEvents]) => sum + venueEvents.length, 0);

  const handleMarkerClick = (venueName: string) => {
    setSelectedVenue(selectedVenue === venueName ? null : venueName);
  };

  const handleRegionChange = (value: string) => {
    if (value) {
      setSelectedRegion(value as UKRegion);
      setSelectedVenue(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Region Filter */}
      <div className="bg-card border border-border/50 rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Region:</span>
          <ToggleGroup
            type="single"
            value={selectedRegion}
            onValueChange={handleRegionChange}
            className="flex-wrap"
          >
            {(Object.keys(REGION_LABELS) as UKRegion[]).map((region) => (
              <ToggleGroupItem
                key={region}
                value={region}
                aria-label={`Filter by ${REGION_LABELS[region]}`}
                className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                {REGION_LABELS[region]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* UK Map Container */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="relative w-full bg-[#1e3a5f]" style={{ height: '500px' }}>
          {/* UK Map SVG */}
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
              fill={selectedRegion === 'scotland' || selectedRegion === 'all' ? '#2d4a3e' : '#1a2e28'}
              stroke="#3d5a4e"
              strokeWidth="1"
              className="transition-colors duration-300"
            />
            
            {/* Northern England */}
            <path
              d="M155 155 L175 155 L185 165 L195 155 L210 160 L220 145 L235 150 L245 160 L260 155 L270 165 L280 160 L290 175 L285 195 L295 210 L290 230 L280 245 L290 260 L275 270 L260 265 L245 275 L230 265 L215 275 L200 265 L185 275 L170 265 L155 275 L140 260 L125 270 L115 255 L130 240 L120 225 L135 210 L125 195 L140 180 L155 185 L155 155Z"
              fill={selectedRegion === 'north' || selectedRegion === 'all' ? '#2d4a3e' : '#1a2e28'}
              stroke="#3d5a4e"
              strokeWidth="1"
              className="transition-colors duration-300"
            />

            {/* Wales */}
            <path
              d="M100 290 L115 275 L130 285 L125 310 L115 330 L100 345 L90 365 L100 385 L90 405 L75 395 L65 375 L70 355 L60 335 L70 315 L85 305 L100 290Z"
              fill={selectedRegion === 'wales' || selectedRegion === 'all' ? '#2d4a3e' : '#1a2e28'}
              stroke="#3d5a4e"
              strokeWidth="1"
              className="transition-colors duration-300"
            />
            
            {/* Midlands */}
            <path
              d="M155 275 L170 265 L185 275 L200 265 L215 275 L230 265 L245 275 L260 265 L275 270 L280 290 L275 310 L285 330 L270 345 L255 335 L240 350 L220 340 L200 350 L180 340 L160 355 L140 345 L125 360 L115 345 L125 325 L115 305 L130 290 L145 300 L155 275Z"
              fill={selectedRegion === 'midlands' || selectedRegion === 'all' ? '#2d4a3e' : '#1a2e28'}
              stroke="#3d5a4e"
              strokeWidth="1"
              className="transition-colors duration-300"
            />
            
            {/* Southern England */}
            <path
              d="M125 360 L140 345 L160 355 L180 340 L200 350 L220 340 L240 350 L255 335 L270 345 L285 330 L300 345 L315 340 L330 360 L340 380 L350 400 L340 420 L355 440 L340 460 L320 450 L300 465 L280 450 L260 470 L240 455 L220 475 L195 460 L170 480 L145 460 L120 475 L100 455 L90 430 L100 410 L90 385 L100 365 L115 375 L125 360Z"
              fill={selectedRegion === 'south' || selectedRegion === 'all' ? '#2d4a3e' : '#1a2e28'}
              stroke="#3d5a4e"
              strokeWidth="1"
              className="transition-colors duration-300"
            />
            
            {/* Ireland (partial - context) */}
            <path
              d="M30 200 L50 190 L70 200 L85 195 L95 215 L90 240 L100 260 L90 285 L75 295 L60 285 L45 300 L30 290 L20 270 L25 245 L15 225 L30 200Z"
              fill="#1a2e28"
              stroke="#3d5a4e"
              strokeWidth="1"
              opacity="0.5"
            />
            
            {/* Grid lines */}
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
                  
                  <span className={`absolute -top-1 -right-1 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                    isSelected ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                  }`}>
                    {venueEvents.length}
                  </span>
                </div>
                
                <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-card text-foreground text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                  isSelected ? 'opacity-100' : ''
                }`}>
                  {name}
                </div>
              </button>
            );
          })}

          {/* Map Labels */}
          <div className={`absolute top-4 left-4 text-xs font-medium transition-colors ${selectedRegion === 'scotland' ? 'text-white' : 'text-white/60'}`}>
            SCOTLAND
          </div>
          <div className={`absolute top-[35%] left-[30%] text-xs font-medium transition-colors ${selectedRegion === 'north' ? 'text-white' : 'text-white/60'}`}>
            NORTH
          </div>
          <div className={`absolute top-[50%] left-[15%] text-xs font-medium transition-colors ${selectedRegion === 'wales' ? 'text-white' : 'text-white/60'}`}>
            WALES
          </div>
          <div className={`absolute top-[55%] left-[45%] text-xs font-medium transition-colors ${selectedRegion === 'midlands' ? 'text-white' : 'text-white/60'}`}>
            MIDLANDS
          </div>
          <div className={`absolute top-[75%] left-[55%] text-xs font-medium transition-colors ${selectedRegion === 'south' ? 'text-white' : 'text-white/60'}`}>
            SOUTH
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-border/50 bg-secondary/30 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            <MapPin className="inline h-4 w-4 text-accent mr-1" />
            Click a marker to view events at that venue
          </p>
          <p className="text-sm text-muted-foreground">
            {mappedVenues.length} venues • {filteredEventCount} events
            {selectedRegion !== 'all' && ` in ${REGION_LABELS[selectedRegion]}`}
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
                  {VENUE_COORDINATES[selectedVenue]?.location || eventsByVenue[selectedVenue][0]?.venue_location || 'United Kingdom'}
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
        <h3 className="font-display text-xl mb-4 text-foreground">
          {selectedRegion === 'all' ? 'All Venues' : `Venues in ${REGION_LABELS[selectedRegion]}`}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVenueEntries.map(([venueName, venueEvents]) => {
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
                        <span className="truncate">{coords?.location || venueEvents[0]?.venue_location || 'UK'}</span>
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

      {filteredVenueEntries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No venues found {selectedRegion !== 'all' ? `in ${REGION_LABELS[selectedRegion]}` : 'with the current filters'}</p>
        </div>
      )}
    </div>
  );
}
