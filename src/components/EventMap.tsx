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

// UK geographic bounds (WGS84)
const UK_BOUNDS = {
  north: 61.0,  // Shetland
  south: 49.9,  // Channel Islands area
  west: -8.5,   // Western Ireland/Scotland
  east: 2.0,    // East coast
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
  // OMG Events - approximate central location
  'OMG Events': { lat: 52.5, lng: -1.5, location: 'Various UK Locations', region: 'midlands' },
};

// Convert lat/lng to SVG coordinates
// The SVG viewBox is 0 0 300 450, representing the UK
function coordsToSVG(lat: number, lng: number): { x: number; y: number } {
  // Map longitude to x: -8.5 to 2.0 -> 0 to 300
  const x = ((lng - UK_BOUNDS.west) / (UK_BOUNDS.east - UK_BOUNDS.west)) * 300;
  // Map latitude to y: 61.0 to 49.9 -> 0 to 450 (inverted because SVG y increases downward)
  const y = ((UK_BOUNDS.north - lat) / (UK_BOUNDS.north - UK_BOUNDS.south)) * 450;
  return { x: Math.max(10, Math.min(290, x)), y: Math.max(10, Math.min(440, y)) };
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
      return { name, events: venueEvents, coords, svgPos: coordsToSVG(coords.lat, coords.lng) };
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

  // Determine region highlight opacity
  const getRegionOpacity = (region: UKRegion) => {
    if (selectedRegion === 'all') return 1;
    return selectedRegion === region ? 1 : 0.3;
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
        <div className="relative w-full bg-[#1a3a5c]" style={{ minHeight: '550px' }}>
          {/* Accurate UK Map SVG */}
          <svg
            viewBox="0 0 300 450"
            className="w-full h-full"
            style={{ minHeight: '550px' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Sea background */}
            <rect width="300" height="450" fill="#1a3a5c" />
            
            {/* Grid lines for reference */}
            <g stroke="#ffffff" strokeWidth="0.3" opacity="0.08">
              {[50, 100, 150, 200, 250, 300, 350, 400].map(y => (
                <line key={`h${y}`} x1="0" y1={y} x2="300" y2={y} />
              ))}
              {[50, 100, 150, 200, 250].map(x => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2="450" />
              ))}
            </g>

            {/* Scotland - accurate outline */}
            <path
              d="M145 45 L155 40 L165 42 L175 38 L182 45 L188 42 L195 50 L200 48 L205 55 L198 62 L205 70 L200 78 L208 85 L202 92 L195 88 L188 95 L180 90 L172 98 L165 95 L158 102 L152 98 L145 105 L138 100 L132 108 L125 102 L120 110 L115 105 L108 112 L102 108 L98 115 L92 110 L88 118 L82 112 L78 120 L72 115 L68 122 L75 130 L70 138 L78 145 L72 152 L82 158 L78 165 L88 170 L85 178 L95 182 L92 190 L105 195 L102 202 L115 205 L120 198 L130 202 L138 195 L148 200 L155 192 L165 198 L172 190 L180 195 L185 188 L178 180 L185 172 L180 165 L188 158 L182 150 L175 155 L168 148 L162 152 L155 145 L150 150 L145 142 L140 148 L135 140 L142 132 L138 125 L145 118 L140 110 L148 102 L145 95 L152 88 L148 80 L155 72 L150 65 L158 58 L152 52 L145 45Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1.5"
              opacity={getRegionOpacity('scotland')}
              className="transition-opacity duration-300"
            />

            {/* Highlands/Islands simplified */}
            <path
              d="M85 55 L95 50 L102 58 L95 65 L100 72 L92 78 L85 72 L80 78 L75 70 L82 62 L85 55Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1"
              opacity={getRegionOpacity('scotland')}
            />
            <path
              d="M60 85 L72 80 L78 88 L70 95 L75 102 L65 108 L58 100 L62 92 L60 85Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1"
              opacity={getRegionOpacity('scotland')}
            />

            {/* Northern England */}
            <path
              d="M115 205 L130 202 L138 210 L148 205 L158 212 L165 205 L175 210 L182 205 L190 212 L195 205 L202 212 L198 225 L205 235 L198 248 L205 258 L198 270 L192 265 L185 272 L178 265 L172 275 L165 268 L158 278 L150 270 L142 280 L135 272 L128 282 L120 275 L112 285 L105 278 L98 288 L92 280 L88 290 L82 282 L78 292 L72 285 L68 292 L75 300 L70 308 L78 315 L72 322 L82 328 L85 320 L95 325 L102 318 L112 325 L120 318 L128 325 L118 210 L115 205Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1.5"
              opacity={getRegionOpacity('north')}
              className="transition-opacity duration-300"
            />

            {/* Wales */}
            <path
              d="M75 300 L82 295 L88 302 L82 310 L88 318 L80 328 L72 320 L65 330 L58 322 L52 332 L48 322 L55 312 L48 302 L55 292 L62 298 L68 290 L75 300Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1.5"
              opacity={getRegionOpacity('wales')}
              className="transition-opacity duration-300"
            />

            {/* Midlands */}
            <path
              d="M88 290 L98 285 L108 292 L118 285 L128 292 L138 285 L148 292 L158 285 L168 292 L175 285 L182 292 L188 285 L195 292 L198 305 L192 318 L200 330 L192 342 L182 335 L172 345 L162 338 L152 348 L142 340 L132 350 L122 342 L112 352 L102 345 L92 355 L88 345 L82 352 L78 342 L85 332 L78 322 L88 312 L82 302 L88 290Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1.5"
              opacity={getRegionOpacity('midlands')}
              className="transition-opacity duration-300"
            />

            {/* Southern England */}
            <path
              d="M92 355 L102 348 L112 355 L122 348 L132 355 L142 348 L152 355 L162 348 L172 355 L182 348 L192 355 L198 348 L205 355 L212 348 L218 358 L225 352 L232 362 L238 355 L245 365 L240 375 L248 385 L242 395 L250 405 L242 415 L235 408 L228 418 L220 410 L212 420 L205 412 L198 422 L190 415 L182 425 L175 418 L168 428 L160 420 L152 430 L145 422 L138 432 L130 425 L122 435 L115 428 L108 438 L100 430 L92 440 L85 432 L78 440 L72 432 L65 440 L60 430 L52 438 L48 428 L55 418 L48 408 L55 398 L48 388 L55 378 L62 385 L68 375 L75 382 L82 372 L88 380 L95 370 L88 362 L92 355Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1.5"
              opacity={getRegionOpacity('south')}
              className="transition-opacity duration-300"
            />

            {/* Cornwall peninsula */}
            <path
              d="M48 428 L42 435 L35 428 L28 438 L22 430 L15 440 L10 432 L18 422 L12 412 L22 405 L18 395 L28 388 L35 398 L42 390 L48 400 L55 392 L48 408 L55 418 L48 428Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1"
              opacity={getRegionOpacity('south')}
            />

            {/* East Anglia bulge */}
            <path
              d="M218 358 L228 352 L238 358 L248 352 L258 362 L265 355 L272 365 L268 378 L275 388 L268 398 L260 390 L252 400 L245 392 L238 402 L248 385 L240 375 L248 365 L242 358 L235 365 L228 358 L218 358Z"
              fill="#2d5a4a"
              stroke="#3d7a6a"
              strokeWidth="1"
              opacity={getRegionOpacity('south')}
            />

            {/* Ireland (for context, faded) */}
            <path
              d="M25 180 L38 175 L48 182 L55 175 L62 185 L58 198 L68 210 L62 225 L72 238 L65 252 L55 245 L45 258 L35 250 L25 262 L18 252 L12 262 L8 250 L15 238 L8 225 L18 212 L12 198 L22 188 L25 180Z"
              fill="#1a3528"
              stroke="#2a4538"
              strokeWidth="1"
              opacity="0.4"
            />

            {/* Major city markers for reference */}
            <g className="pointer-events-none">
              {/* London */}
              <circle cx="195" cy="385" r="3" fill="#ffffff" opacity="0.2" />
              {/* Birmingham */}
              <circle cx="150" cy="330" r="2" fill="#ffffff" opacity="0.15" />
              {/* Manchester */}
              <circle cx="128" cy="285" r="2" fill="#ffffff" opacity="0.15" />
              {/* Leeds */}
              <circle cx="155" cy="275" r="2" fill="#ffffff" opacity="0.15" />
              {/* Edinburgh */}
              <circle cx="148" cy="175" r="2" fill="#ffffff" opacity="0.15" />
              {/* Glasgow */}
              <circle cx="118" cy="182" r="2" fill="#ffffff" opacity="0.15" />
              {/* Cardiff */}
              <circle cx="82" cy="365" r="2" fill="#ffffff" opacity="0.15" />
            </g>

            {/* Region Labels */}
            <g className="pointer-events-none">
              <text
                x="140"
                y="120"
                fill={selectedRegion === 'scotland' || selectedRegion === 'all' ? '#ffffff' : '#ffffff40'}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                className="transition-all duration-300"
              >
                SCOTLAND
              </text>
              <text
                x="145"
                y="255"
                fill={selectedRegion === 'north' || selectedRegion === 'all' ? '#ffffff' : '#ffffff40'}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                className="transition-all duration-300"
              >
                NORTH
              </text>
              <text
                x="62"
                y="315"
                fill={selectedRegion === 'wales' || selectedRegion === 'all' ? '#ffffff' : '#ffffff40'}
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
                className="transition-all duration-300"
              >
                WALES
              </text>
              <text
                x="148"
                y="320"
                fill={selectedRegion === 'midlands' || selectedRegion === 'all' ? '#ffffff' : '#ffffff40'}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                className="transition-all duration-300"
              >
                MIDLANDS
              </text>
              <text
                x="170"
                y="395"
                fill={selectedRegion === 'south' || selectedRegion === 'all' ? '#ffffff' : '#ffffff40'}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                className="transition-all duration-300"
              >
                SOUTH
              </text>
            </g>

            {/* Venue Markers */}
            {mappedVenues.map(({ name, events: venueEvents, svgPos }) => {
              const isSelected = selectedVenue === name;
              
              return (
                <g
                  key={name}
                  className="cursor-pointer"
                  onClick={() => handleMarkerClick(name)}
                >
                  {/* Marker shadow */}
                  <ellipse
                    cx={svgPos.x}
                    cy={svgPos.y + 12}
                    rx="6"
                    ry="3"
                    fill="#000000"
                    opacity="0.3"
                  />
                  {/* Pin */}
                  <path
                    d={`M${svgPos.x} ${svgPos.y + 10} L${svgPos.x - 6} ${svgPos.y - 4} Q${svgPos.x - 7} ${svgPos.y - 14} ${svgPos.x} ${svgPos.y - 16} Q${svgPos.x + 7} ${svgPos.y - 14} ${svgPos.x + 6} ${svgPos.y - 4} Z`}
                    fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="transition-all duration-200 hover:scale-110"
                    style={{ transformOrigin: `${svgPos.x}px ${svgPos.y}px` }}
                  />
                  {/* Inner circle */}
                  <circle
                    cx={svgPos.x}
                    cy={svgPos.y - 6}
                    r="4"
                    fill="#ffffff"
                  />
                  {/* Event count badge */}
                  <circle
                    cx={svgPos.x + 8}
                    cy={svgPos.y - 14}
                    r="7"
                    fill={isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x={svgPos.x + 8}
                    y={svgPos.y - 11}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--primary-foreground))'}
                  >
                    {venueEvents.length}
                  </text>
                  {/* Venue name tooltip on hover/select */}
                  {isSelected && (
                    <g>
                      <rect
                        x={svgPos.x - 45}
                        y={svgPos.y - 35}
                        width="90"
                        height="16"
                        rx="3"
                        fill="hsl(var(--card))"
                        stroke="hsl(var(--border))"
                        strokeWidth="0.5"
                      />
                      <text
                        x={svgPos.x}
                        y={svgPos.y - 23}
                        textAnchor="middle"
                        fontSize="7"
                        fontWeight="500"
                        fill="hsl(var(--foreground))"
                      >
                        {name.length > 18 ? name.substring(0, 18) + '...' : name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
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
