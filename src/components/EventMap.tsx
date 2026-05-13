import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Clock, ExternalLink, Globe, MapPin, Minus, Navigation, Plus, X, Map } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import ukGeoJsonRaw from '@/assets/geo/GBR.geo.json?raw';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { VENUE_COORDINATES, type UKRegion } from '@/lib/venueCoordinates';
// Region definitions for filtering
export type { UKRegion };

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

// Zoom configuration
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.5;


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
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Popover state for marker quick actions
  const [markerPopover, setMarkerPopover] = useState<{ name: string; x: number; y: number } | null>(null);
  
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

  const handleMarkerClick = (venueName: string, screenX?: number, screenY?: number) => {
    if (screenX !== undefined && screenY !== undefined) {
      setMarkerPopover({ name: venueName, x: screenX, y: screenY });
    }
    setSelectedVenue(selectedVenue === venueName ? null : venueName);
  };

  const handleClosePopover = () => {
    setMarkerPopover(null);
  };

  const handleRegionChange = (value: string) => {
    if (value) {
      setSelectedRegion(value as UKRegion);
      setSelectedVenue(null);
      // Reset zoom and pan when changing region
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      if (newZoom === MIN_ZOOM) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Close popover when clicking on the map background
    setMarkerPopover(null);
    if (zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      const maxPan = (zoom - 1) * MAP_VIEWBOX.width / 2;
      const maxPanY = (zoom - 1) * MAP_VIEWBOX.height / 2;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, e.clientX - panStart.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, e.clientY - panStart.y)),
      });
    }
  }, [isPanning, zoom, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

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

  // Calculate the dynamic viewBox based on zoom and pan
  const viewBox = useMemo(() => {
    const w = MAP_VIEWBOX.width / zoom;
    const h = MAP_VIEWBOX.height / zoom;
    const centerX = MAP_VIEWBOX.width / 2;
    const centerY = MAP_VIEWBOX.height / 2;
    const x = centerX - w / 2 - (pan.x / zoom) * 0.15;
    const y = centerY - h / 2 - (pan.y / zoom) * 0.15;
    return `${x} ${y} ${w} ${h}`;
  }, [zoom, pan]);

  // Scale factor to counteract marker scaling when zoomed
  const markerScale = 1 / zoom;

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
        <div 
          className="relative w-full bg-muted" 
          style={{ height: '600px', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        >
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-md"
              title="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-md"
              title="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            {zoom > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetView}
                className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-md text-xs px-2"
                title="Reset view"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Zoom Level Indicator */}
          {zoom > 1 && (
            <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-border/50 rounded-md px-3 py-1 shadow-md">
              <span className="text-sm font-medium text-foreground">{zoom.toFixed(1)}x</span>
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="absolute inset-0 w-full h-full select-none"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="UK map with venue markers"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Sea */}
            <rect x={-100} y={-100} width={MAP_VIEWBOX.width + 200} height={MAP_VIEWBOX.height + 200} fill="hsl(var(--muted))" />

            {/* UK landmass (GeoJSON projected) */}
            {ukPathD ? (
              <path
                d={ukPathD}
                fill="hsl(var(--card))"
                stroke="hsl(var(--border))"
                strokeWidth={1 * markerScale}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <text
                x={MAP_VIEWBOX.width / 2}
                y={MAP_VIEWBOX.height / 2}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={12 * markerScale}
              >
                Map data failed to load
              </text>
            )}

            {/* City reference points */}
            {cities.map((c) => (
              <g key={c.name}>
                <circle cx={c.x} cy={c.y} r={1.6 * markerScale} fill="hsl(var(--foreground))" opacity={0.35} />
                <text
                  x={c.x + 3 * markerScale}
                  y={c.y + 1 * markerScale}
                  fill="hsl(var(--foreground))"
                  opacity={0.45}
                  fontSize={6 * markerScale}
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
                fontSize={9 * markerScale}
                fontWeight={600}
                className="pointer-events-none"
              >
                {r.label}
              </text>
            ))}

            {/* Venue markers - scaled inversely to zoom to maintain constant visual size */}
            {venueMarkers.map((v) => {
              const isSelected = selectedVenue === v.name;
              const badgeFill = isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))';
              const badgeText = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--primary-foreground))';

              return (
                <g
                  key={v.name}
                  transform={`translate(${v.x} ${v.y}) scale(${markerScale})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkerClick(v.name, e.clientX, e.clientY);
                  }}
                  className={`cursor-pointer transition-transform ${isSelected ? 'text-primary' : 'text-accent hover:text-primary'}`}
                >
                  <title>
                    {v.name} - {v.events.length} event{v.events.length !== 1 ? 's' : ''}
                  </title>

                  {/* Pin - scaled down to 30% of original size */}
                  <g transform="translate(-4.2 -10.8) scale(0.3)">
                    <path
                      d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
                      fill="currentColor"
                    />
                    <circle cx="14" cy="12" r="5" fill="hsl(var(--background))" />
                  </g>

                  {/* Count badge - scaled down to 30% */}
                  <g transform="translate(3 -10.2)">
                    <circle r="2.4" fill={badgeFill} />
                    <text
                      x={0}
                      y={0.9}
                      textAnchor="middle"
                      fontSize={2.4}
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

          {/* Marker Popover - positioned at click location */}
          {markerPopover && (
            <div
              className="fixed z-50 animate-in fade-in-0 zoom-in-95"
              style={{
                left: markerPopover.x,
                top: markerPopover.y - 10,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-foreground text-sm truncate flex-1">
                    {markerPopover.name}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close venue popover"
                    className="h-6 w-6 shrink-0"
                    onClick={handleClosePopover}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {VENUE_COORDINATES[markerPopover.name]?.location || 'United Kingdom'}
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href={getGoogleMapsUrl(markerPopover.name, VENUE_COORDINATES[markerPopover.name]?.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleClosePopover}
                    >
                      <Map className="h-4 w-4 mr-2" />
                      View on Google Maps
                    </a>
                  </Button>
                  {getVenueWebsite(markerPopover.name) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      asChild
                    >
                      <a
                        href={getVenueWebsite(markerPopover.name)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleClosePopover}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Visit Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-border/50 bg-secondary/30 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            <MapPin className="inline h-4 w-4 text-accent mr-1" />
            Click a marker to view events • Scroll to zoom • Drag to pan
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
                  aria-label="Close venue details"
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
                      {format(parseISO(event.event_date), 'EEEE, d MMMM yyyy')}
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
                          aria-label={`Visit ${venueName} website`}
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
                        aria-label={`Get directions to ${venueName}`}
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
                        <span className="shrink-0">• {format(parseISO(event.event_date), 'd MMM')}</span>
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
