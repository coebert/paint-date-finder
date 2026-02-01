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

// UK geographic bounds
const UK_BOUNDS = {
  north: 59.0,
  south: 50.0,
  west: -7.5,
  east: 2.0,
};

// Real UK venue coordinates with region
const VENUE_COORDINATES: Record<string, { lat: number; lng: number; location: string; region: UKRegion }> = {
  // South
  'Campaign Paintball': { lat: 51.28, lng: -0.45, location: 'Effingham, Surrey', region: 'south' },
  'Campaign Paintball Park': { lat: 51.28, lng: -0.45, location: 'Cobham, Surrey', region: 'south' },
  'CPG Paintball': { lat: 51.38, lng: -0.52, location: 'Chertsey, Surrey', region: 'south' },
  'Bedlam Paintball': { lat: 51.15, lng: 0.87, location: 'Ashford, Kent', region: 'south' },
  'Go Paintball London': { lat: 51.51, lng: -0.13, location: 'London', region: 'south' },
  'Mayhem Paintball': { lat: 51.67, lng: 0.08, location: 'Abridge, Essex', region: 'south' },
  'Ground Zero Paintball': { lat: 50.85, lng: -1.79, location: 'Ringwood, Hampshire', region: 'south' },
  'Red Alert Paintball': { lat: 51.72, lng: -0.54, location: 'Bovingdon, Hertfordshire', region: 'south' },
  // Midlands
  'Delta Force Paintball Birmingham': { lat: 52.49, lng: -1.89, location: 'Birmingham', region: 'midlands' },
  'NPF Bassetts Pole': { lat: 52.58, lng: -1.75, location: 'Sutton Coldfield', region: 'midlands' },
  'Skirmish Paintball': { lat: 53.05, lng: -1.05, location: 'Nottinghamshire', region: 'midlands' },
  // North
  'The Gathering Paintball': { lat: 53.65, lng: -1.78, location: 'Huddersfield', region: 'north' },
  'Delta Force Paintball Leeds': { lat: 53.80, lng: -1.55, location: 'Leeds', region: 'north' },
  'Special Ops Paintball': { lat: 53.75, lng: -1.60, location: 'Leeds', region: 'north' },
  'Bedlam Paintball - Manchester': { lat: 53.48, lng: -2.24, location: 'Manchester', region: 'north' },
  // Scotland
  'Bedlam Paintball - Edinburgh': { lat: 55.95, lng: -3.19, location: 'Edinburgh', region: 'scotland' },
  'Bedlam Paintball - Glasgow': { lat: 55.86, lng: -4.25, location: 'Glasgow', region: 'scotland' },
  // Wales
  'Delta Force Paintball Cardiff': { lat: 51.48, lng: -3.18, location: 'Cardiff', region: 'wales' },
  // OMG Events
  'OMG Events': { lat: 52.5, lng: -1.5, location: 'Various UK Locations', region: 'midlands' },
};

// Convert lat/lng to percentage position
function coordsToPercent(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - UK_BOUNDS.west) / (UK_BOUNDS.east - UK_BOUNDS.west)) * 100;
  const y = ((UK_BOUNDS.north - lat) / (UK_BOUNDS.north - UK_BOUNDS.south)) * 100;
  return { x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) };
}

interface EventMapProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

export function EventMap({ events, onEventClick }: EventMapProps) {
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<UKRegion>('all');

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
  
  const mappedVenues = venueEntries.map(([name, venueEvents]) => {
    const coords = VENUE_COORDINATES[name];
    if (coords) {
      return { name, events: venueEvents, coords, position: coordsToPercent(coords.lat, coords.lng) };
    }
    return null;
  }).filter((v): v is NonNullable<typeof v> => {
    if (!v) return false;
    if (selectedRegion === 'all') return true;
    return v.coords.region === selectedRegion;
  });

  const filteredVenueEntries = venueEntries.filter(([name]) => {
    if (selectedRegion === 'all') return true;
    const coords = VENUE_COORDINATES[name];
    return coords?.region === selectedRegion;
  });

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

  const getRegionFill = (region: UKRegion) => {
    if (selectedRegion === 'all') return '#2d5a4a';
    return selectedRegion === region ? '#3d7a5a' : '#1a3528';
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
        <div className="relative w-full bg-[#1a3a5c]" style={{ height: '550px' }}>
          {/* UK Map SVG - Simplified realistic outline */}
          <svg
            viewBox="0 0 100 140"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Sea */}
            <rect width="100" height="140" fill="#1a3a5c" />

            {/* Scotland mainland */}
            <path
              d="M45 8 L52 6 L58 8 L62 12 L65 10 L68 14 L70 12 L72 18 L70 24 L74 30 L70 36 L66 34 L62 40 L58 38 L54 44 L50 42 L46 48 L42 46 L38 50 L36 46 L32 50 L30 44 L28 48 L26 42 L30 36 L26 30 L32 24 L28 18 L34 14 L32 10 L38 8 L42 12 L45 8Z"
              fill={getRegionFill('scotland')}
              stroke="#4a8a6a"
              strokeWidth="0.8"
              className="transition-all duration-300"
            />
            {/* Scottish islands */}
            <path
              d="M22 20 L28 18 L30 24 L26 28 L20 26 L22 20Z"
              fill={getRegionFill('scotland')}
              stroke="#4a8a6a"
              strokeWidth="0.5"
              className="transition-all duration-300"
            />
            <path
              d="M18 32 L24 30 L26 36 L22 40 L16 38 L18 32Z"
              fill={getRegionFill('scotland')}
              stroke="#4a8a6a"
              strokeWidth="0.5"
              className="transition-all duration-300"
            />

            {/* Northern England */}
            <path
              d="M38 50 L42 46 L46 48 L50 42 L54 44 L58 38 L62 40 L66 34 L70 36 L72 42 L70 50 L74 58 L70 66 L66 62 L62 68 L58 64 L54 70 L48 66 L44 72 L38 68 L34 74 L30 70 L28 76 L32 66 L28 58 L34 52 L38 50Z"
              fill={getRegionFill('north')}
              stroke="#4a8a6a"
              strokeWidth="0.8"
              className="transition-all duration-300"
            />

            {/* Wales */}
            <path
              d="M28 76 L32 72 L36 76 L34 84 L30 90 L26 94 L22 90 L20 82 L24 78 L28 76Z"
              fill={getRegionFill('wales')}
              stroke="#4a8a6a"
              strokeWidth="0.8"
              className="transition-all duration-300"
            />

            {/* Midlands */}
            <path
              d="M34 74 L38 68 L44 72 L48 66 L54 70 L58 64 L62 68 L66 62 L70 66 L72 74 L70 82 L74 90 L68 96 L62 92 L56 98 L50 94 L44 100 L38 96 L36 88 L34 84 L36 76 L34 74Z"
              fill={getRegionFill('midlands')}
              stroke="#4a8a6a"
              strokeWidth="0.8"
              className="transition-all duration-300"
            />

            {/* Southern England */}
            <path
              d="M26 94 L30 90 L34 84 L36 88 L38 96 L44 100 L50 94 L56 98 L62 92 L68 96 L74 90 L78 96 L82 92 L86 98 L84 108 L88 116 L82 124 L74 120 L68 128 L60 122 L52 130 L44 124 L36 132 L28 126 L22 134 L16 128 L12 118 L18 108 L14 98 L20 92 L26 94Z"
              fill={getRegionFill('south')}
              stroke="#4a8a6a"
              strokeWidth="0.8"
              className="transition-all duration-300"
            />

            {/* Cornwall */}
            <path
              d="M12 118 L16 128 L10 134 L4 130 L2 120 L8 114 L12 118Z"
              fill={getRegionFill('south')}
              stroke="#4a8a6a"
              strokeWidth="0.5"
              className="transition-all duration-300"
            />

            {/* East Anglia bulge */}
            <path
              d="M78 96 L82 92 L86 98 L90 94 L94 102 L92 112 L86 118 L84 108 L88 104 L84 100 L78 96Z"
              fill={getRegionFill('south')}
              stroke="#4a8a6a"
              strokeWidth="0.5"
              className="transition-all duration-300"
            />

            {/* Ireland (context) */}
            <path
              d="M8 52 L16 48 L22 54 L20 66 L24 76 L18 86 L10 82 L4 70 L6 58 L8 52Z"
              fill="#1a3528"
              stroke="#2a4538"
              strokeWidth="0.5"
              opacity="0.4"
            />

            {/* Region labels */}
            <text x="50" y="30" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="600" opacity={selectedRegion === 'scotland' || selectedRegion === 'all' ? 0.9 : 0.3}>SCOTLAND</text>
            <text x="52" y="58" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="600" opacity={selectedRegion === 'north' || selectedRegion === 'all' ? 0.9 : 0.3}>NORTH</text>
            <text x="26" y="86" textAnchor="middle" fill="#ffffff" fontSize="3.5" fontWeight="600" opacity={selectedRegion === 'wales' || selectedRegion === 'all' ? 0.9 : 0.3}>WALES</text>
            <text x="54" y="84" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="600" opacity={selectedRegion === 'midlands' || selectedRegion === 'all' ? 0.9 : 0.3}>MIDLANDS</text>
            <text x="55" y="112" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="600" opacity={selectedRegion === 'south' || selectedRegion === 'all' ? 0.9 : 0.3}>SOUTH</text>
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
                style={{ top: `${position.y}%`, left: `${position.x}%` }}
                onClick={() => handleMarkerClick(name)}
                title={`${name} - ${venueEvents.length} event${venueEvents.length !== 1 ? 's' : ''}`}
              >
                <div className="relative">
                  <svg 
                    width="28" 
                    height="36" 
                    viewBox="0 0 28 36" 
                    className={`drop-shadow-lg transition-colors ${
                      isSelected ? 'text-primary' : 'text-accent group-hover:text-primary'
                    }`}
                  >
                    <path
                      d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
                      fill="currentColor"
                    />
                    <circle cx="14" cy="12" r="5" fill="white" />
                  </svg>
                  
                  <span className={`absolute -top-1 -right-1 text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                    isSelected ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                  }`}>
                    {venueEvents.length}
                  </span>
                </div>
                
                <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-card text-foreground text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border ${
                  isSelected ? 'opacity-100' : ''
                }`}>
                  {name}
                </div>
              </button>
            );
          })}
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
