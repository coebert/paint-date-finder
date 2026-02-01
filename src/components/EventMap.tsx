import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, Clock, ExternalLink, Globe, MapPin, Navigation, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import ukGeoJsonRaw from '@/assets/geo/GBR.geo.json?raw';
import { useVenueDetails } from '@/hooks/useVenueDetails';

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

const MAP_VIEWBOX = { width: 220, height: 340 };
const MAP_PADDING = 12;

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


type GeoJSONAny = any;

function projectPoint(projection: GeoProjection | null, lat: number, lng: number): [number, number] | null {
  if (!projection) return null;
  const p = projection([lng, lat]);
  if (!p) return null;
  return [p[0], p[1]];
}

interface EventMapProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

export function EventMap({ events, onEventClick }: EventMapProps) {
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<UKRegion>('all');
  const { data: venueDetails } = useVenueDetails();
  
  const getVenueWebsite = (venueName: string): string | null => {
    return venueDetails?.get(venueName)?.website ?? null;
  };

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

  const venueEntries = useMemo(() => Object.entries(eventsByVenue), [eventsByVenue]);

  const mappedVenues = useMemo(() => {
    return venueEntries
      .map(([name, venueEvents]) => {
        const coords = VENUE_COORDINATES[name];
        if (!coords) return null;
        return { name, events: venueEvents, coords };
      })
      .filter((v): v is NonNullable<typeof v> => {
        if (!v) return false;
        if (selectedRegion === 'all') return true;
        return v.coords.region === selectedRegion;
      });
  }, [venueEntries, selectedRegion]);

  const filteredVenueEntries = useMemo(() => venueEntries.filter(([name]) => {
    if (selectedRegion === 'all') return true;
    const coords = VENUE_COORDINATES[name];
    return coords?.region === selectedRegion;
  }), [venueEntries, selectedRegion]);

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

  const ukGeo = useMemo<GeoJSONAny | null>(() => {
    try {
      return JSON.parse(ukGeoJsonRaw) as GeoJSONAny;
    } catch {
      return null;
    }
  }, []);

  const projection = useMemo<GeoProjection | null>(() => {
    if (!ukGeo) return null;
    const p = geoMercator();
    p.fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [MAP_VIEWBOX.width - MAP_PADDING, MAP_VIEWBOX.height - MAP_PADDING],
      ],
      ukGeo,
    );
    return p;
  }, [ukGeo]);

  const ukPathD = useMemo(() => {
    if (!ukGeo || !projection) return '';
    const path = geoPath(projection);
    return path(ukGeo) ?? '';
  }, [ukGeo, projection]);

  const cities = useMemo(() => {
    if (!projection) return [] as Array<{ name: string; x: number; y: number }>;
    const base = [
      { name: 'London', lat: 51.5072, lng: -0.1276 },
      { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
      { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
      { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
      { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
      { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
      { name: 'Cardiff', lat: 51.4816, lng: -3.1791 },
      { name: 'Belfast', lat: 54.5973, lng: -5.9301 },
    ];
    return base
      .map((c) => {
        const pt = projectPoint(projection, c.lat, c.lng);
        if (!pt) return null;
        return { name: c.name, x: pt[0], y: pt[1] };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [projection]);

  const regionLabels = useMemo(() => {
    if (!projection) return [] as Array<{ region: UKRegion; label: string; x: number; y: number }>;
    const anchors: Array<{ region: UKRegion; label: string; lat: number; lng: number }> = [
      { region: 'scotland', label: 'SCOTLAND', lat: 56.9, lng: -4.2 },
      { region: 'north', label: 'NORTH', lat: 54.7, lng: -2.4 },
      { region: 'wales', label: 'WALES', lat: 52.2, lng: -3.7 },
      { region: 'midlands', label: 'MIDLANDS', lat: 52.7, lng: -1.7 },
      { region: 'south', label: 'SOUTH', lat: 51.2, lng: -1.6 },
    ];
    return anchors
      .map((a) => {
        const pt = projectPoint(projection, a.lat, a.lng);
        if (!pt) return null;
        return { region: a.region, label: a.label, x: pt[0], y: pt[1] };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [projection]);

  const venueMarkers = useMemo(() => {
    if (!projection) return [] as Array<{ name: string; x: number; y: number; events: PaintballEvent[] }>;
    return mappedVenues
      .map((v) => {
        const pt = projectPoint(projection, v.coords.lat, v.coords.lng);
        if (!pt) return null;
        return { name: v.name, x: pt[0], y: pt[1], events: v.events };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [mappedVenues, projection]);

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
        <div className="relative w-full bg-muted" style={{ height: '600px' }}>
          <svg
            viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="UK map with venue markers"
          >
            {/* Sea */}
            <rect width={MAP_VIEWBOX.width} height={MAP_VIEWBOX.height} fill="hsl(var(--muted))" />

            {/* UK landmass (GeoJSON projected) */}
            {ukPathD ? (
              <path
                d={ukPathD}
                fill="hsl(var(--card))"
                stroke="hsl(var(--border))"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <text
                x={MAP_VIEWBOX.width / 2}
                y={MAP_VIEWBOX.height / 2}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={12}
              >
                Map data failed to load
              </text>
            )}

            {/* City reference points */}
            {cities.map((c) => (
              <g key={c.name}>
                <circle cx={c.x} cy={c.y} r={1.6} fill="hsl(var(--foreground))" opacity={0.35} />
                <text
                  x={c.x + 3}
                  y={c.y + 1}
                  fill="hsl(var(--foreground))"
                  opacity={0.45}
                  fontSize={6}
                  className="pointer-events-none"
                >
                  {c.name}
                </text>
              </g>
            ))}

            {/* Region labels (for orientation) */}
            {regionLabels.map((r) => (
              <text
                key={r.region}
                x={r.x}
                y={r.y}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                opacity={selectedRegion === 'all' || selectedRegion === r.region ? 0.6 : 0.2}
                fontSize={9}
                fontWeight={600}
                className="pointer-events-none"
              >
                {r.label}
              </text>
            ))}

            {/* Venue markers (rendered in the same projected SVG space for maximum accuracy) */}
            {venueMarkers.map((v) => {
              const isSelected = selectedVenue === v.name;
              const badgeFill = isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))';
              const badgeText = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--primary-foreground))';

              return (
                <g
                  key={v.name}
                  transform={`translate(${v.x} ${v.y})`}
                  onClick={() => handleMarkerClick(v.name)}
                  className={`cursor-pointer transition-transform ${isSelected ? 'text-primary' : 'text-accent hover:text-primary'}`}
                >
                  <title>
                    {v.name} - {v.events.length} event{v.events.length !== 1 ? 's' : ''}
                  </title>

                  {/* Pin */}
                  <g transform="translate(-14 -36)">
                    <path
                      d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
                      fill="currentColor"
                    />
                    <circle cx="14" cy="12" r="5" fill="hsl(var(--background))" />
                  </g>

                  {/* Count badge */}
                  <g transform="translate(10 -34)">
                    <circle r="8" fill={badgeFill} />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      fontSize={8}
                      fontWeight={800}
                      fill={badgeText}
                    >
                      {v.events.length}
                    </text>
                  </g>
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
                {getVenueWebsite(selectedVenue) && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    asChild
                  >
                    <a 
                      href={getVenueWebsite(selectedVenue)!} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
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
                    <div className="flex gap-1 shrink-0">
                      {getVenueWebsite(venueName) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getVenueWebsite(venueName)!, '_blank');
                          }}
                          title="Visit website"
                        >
                          <Globe className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(getGoogleMapsUrl(venueName, venueEvents[0]?.venue_location), '_blank');
                        }}
                        title="Get directions"
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    </div>
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
