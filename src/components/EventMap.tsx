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

// UK geographic bounds (WGS84) - precise bounds for accurate mapping
const UK_BOUNDS = {
  north: 58.7,  // Northern tip of mainland Scotland
  south: 49.9,  // Southern tip of England
  west: -8.2,   // Western Scotland
  east: 1.8,    // Eastern England
};

// SVG dimensions - aspect ratio matches UK proportions
const SVG_WIDTH = 180;
const SVG_HEIGHT = 270;

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

// Convert geographic coordinates to SVG coordinates
function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - UK_BOUNDS.west) / (UK_BOUNDS.east - UK_BOUNDS.west)) * SVG_WIDTH;
  const y = ((UK_BOUNDS.north - lat) / (UK_BOUNDS.north - UK_BOUNDS.south)) * SVG_HEIGHT;
  return { x, y };
}

// Convert lat/lng to percentage for marker positioning
function coordsToPercent(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - UK_BOUNDS.west) / (UK_BOUNDS.east - UK_BOUNDS.west)) * 100;
  const y = ((UK_BOUNDS.north - lat) / (UK_BOUNDS.north - UK_BOUNDS.south)) * 100;
  return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
}

// Generate SVG path from geographic coordinates
function geoPathFromCoords(coords: [number, number][]): string {
  return coords.map((coord, i) => {
    const { x, y } = geoToSvg(coord[0], coord[1]);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

// Accurate UK coastline coordinates [lat, lng] - simplified but geographically correct
const UK_COASTLINE = {
  // Scotland mainland - key coastal points
  scotland: [
    [58.6, -3.0], [58.5, -3.5], [58.3, -4.0], [58.4, -4.5], [58.2, -5.0],
    [57.8, -5.5], [57.5, -5.8], [57.2, -5.6], [56.9, -5.8], [56.5, -6.2],
    [56.3, -5.8], [56.0, -5.4], [55.8, -5.0], [55.5, -4.8], [55.3, -4.9],
    [55.0, -5.0], [54.9, -5.1], [54.8, -4.9], [54.7, -4.5], [54.8, -4.0],
    [55.0, -3.5], [55.2, -3.0], [55.4, -2.6], [55.6, -2.2], [55.8, -1.9],
    [55.9, -1.8], [56.0, -2.0], [56.2, -2.4], [56.4, -2.8], [56.5, -3.2],
    [56.7, -3.5], [56.9, -3.8], [57.0, -4.0], [57.2, -4.2], [57.4, -3.8],
    [57.6, -3.5], [57.8, -3.2], [58.0, -3.0], [58.2, -3.2], [58.4, -3.0],
    [58.6, -3.0],
  ] as [number, number][],
  
  // Scottish islands - Hebrides (simplified)
  hebrides: [
    [57.8, -6.8], [57.5, -7.2], [57.2, -7.4], [56.8, -7.2], [56.5, -7.0],
    [56.3, -6.6], [56.5, -6.2], [56.8, -6.0], [57.2, -6.2], [57.5, -6.5],
    [57.8, -6.8],
  ] as [number, number][],
  
  // Orkney (simplified)
  orkney: [
    [59.0, -3.0], [58.9, -3.4], [58.7, -3.2], [58.8, -2.8], [59.0, -3.0],
  ] as [number, number][],
  
  // Northern England
  north: [
    [55.4, -2.6], [55.2, -3.0], [55.0, -3.5], [54.8, -4.0], [54.7, -4.5],
    [54.5, -4.0], [54.3, -3.5], [54.1, -3.2], [53.9, -3.0], [53.7, -3.1],
    [53.5, -3.0], [53.3, -2.8], [53.2, -3.0], [53.1, -3.1], [53.0, -3.0],
    [53.0, -2.0], [53.2, -1.5], [53.4, -1.2], [53.6, -1.0], [53.8, -0.8],
    [54.0, -0.6], [54.2, -0.4], [54.4, -0.2], [54.6, -0.4], [54.8, -0.8],
    [55.0, -1.2], [55.2, -1.5], [55.4, -1.8], [55.6, -2.2], [55.4, -2.6],
  ] as [number, number][],
  
  // Wales
  wales: [
    [53.1, -3.1], [53.2, -3.0], [53.3, -2.8], [53.3, -3.5], [53.2, -4.0],
    [53.0, -4.5], [52.8, -4.7], [52.5, -4.8], [52.2, -4.6], [51.9, -4.8],
    [51.7, -5.2], [51.5, -5.0], [51.4, -4.5], [51.5, -4.0], [51.6, -3.5],
    [51.7, -3.2], [51.8, -3.0], [51.9, -2.9], [52.0, -3.0], [52.2, -3.0],
    [52.4, -3.0], [52.6, -3.0], [52.8, -3.0], [53.0, -3.0], [53.1, -3.1],
  ] as [number, number][],
  
  // Midlands - connection between North and South
  midlands: [
    [53.0, -3.0], [52.8, -3.0], [52.6, -3.0], [52.4, -3.0], [52.2, -3.0],
    [52.0, -3.0], [51.9, -2.9], [51.8, -2.6], [51.7, -2.2], [51.8, -1.8],
    [51.9, -1.5], [52.0, -1.2], [52.2, -1.0], [52.4, -0.8], [52.6, -0.6],
    [52.8, -0.4], [53.0, -0.2], [53.0, -0.5], [53.0, -1.0], [53.0, -1.5],
    [53.0, -2.0], [53.0, -3.0],
  ] as [number, number][],
  
  // Southern England
  south: [
    [51.8, -1.8], [51.7, -2.2], [51.6, -2.6], [51.5, -2.9], [51.4, -3.2],
    [51.2, -3.5], [51.0, -3.8], [50.8, -4.0], [50.5, -4.5], [50.2, -5.0],
    [50.0, -5.5], [49.9, -5.2], [50.0, -4.8], [50.2, -4.3], [50.4, -3.8],
    [50.5, -3.5], [50.6, -3.0], [50.5, -2.5], [50.4, -2.0], [50.5, -1.5],
    [50.6, -1.0], [50.7, -0.8], [50.8, -0.5], [50.7, 0.0], [50.8, 0.5],
    [50.9, 1.0], [51.1, 1.4], [51.3, 1.4], [51.5, 1.2], [51.6, 0.8],
    [51.7, 0.5], [51.8, 0.2], [51.9, -0.2], [52.0, -0.5], [52.2, -0.8],
    [52.4, -0.8], [52.6, -0.6], [52.8, -0.4], [53.0, -0.2], [52.8, -0.4],
    [52.6, -0.6], [52.4, -0.8], [52.2, -1.0], [52.0, -1.2], [51.9, -1.5],
    [51.8, -1.8],
  ] as [number, number][],
  
  // Ireland (context)
  ireland: [
    [55.3, -5.5], [55.0, -6.0], [54.5, -6.5], [54.0, -7.0], [53.5, -7.5],
    [53.0, -8.0], [52.5, -7.8], [52.0, -7.5], [51.5, -8.0], [51.3, -8.5],
    [51.5, -9.5], [52.0, -10.2], [52.5, -10.0], [53.0, -9.8], [53.5, -9.5],
    [54.0, -8.5], [54.5, -8.0], [55.0, -7.5], [55.3, -7.0], [55.4, -6.5],
    [55.3, -5.5],
  ] as [number, number][],
};

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

  const getRegionStyle = (region: UKRegion) => {
    const isActive = selectedRegion === 'all' || selectedRegion === region;
    return {
      fill: isActive ? '#2d6a4f' : '#1a3d2e',
      stroke: isActive ? '#52b788' : '#2d5a4a',
      strokeWidth: isActive ? 1.5 : 0.8,
      opacity: isActive ? 1 : 0.4,
    };
  };

  // City reference points for context
  const cities = [
    { name: 'London', lat: 51.51, lng: -0.13 },
    { name: 'Birmingham', lat: 52.49, lng: -1.89 },
    { name: 'Manchester', lat: 53.48, lng: -2.24 },
    { name: 'Leeds', lat: 53.80, lng: -1.55 },
    { name: 'Edinburgh', lat: 55.95, lng: -3.19 },
    { name: 'Glasgow', lat: 55.86, lng: -4.25 },
    { name: 'Cardiff', lat: 51.48, lng: -3.18 },
    { name: 'Bristol', lat: 51.45, lng: -2.58 },
    { name: 'Liverpool', lat: 53.41, lng: -2.98 },
    { name: 'Newcastle', lat: 54.98, lng: -1.61 },
  ].map(city => ({ ...city, svg: geoToSvg(city.lat, city.lng) }));

  // Generate paths from coordinates
  const scotlandPath = geoPathFromCoords(UK_COASTLINE.scotland);
  const hebridesPath = geoPathFromCoords(UK_COASTLINE.hebrides);
  const orkneyPath = geoPathFromCoords(UK_COASTLINE.orkney);
  const northPath = geoPathFromCoords(UK_COASTLINE.north);
  const walesPath = geoPathFromCoords(UK_COASTLINE.wales);
  const midlandsPath = geoPathFromCoords(UK_COASTLINE.midlands);
  const southPath = geoPathFromCoords(UK_COASTLINE.south);
  const irelandPath = geoPathFromCoords(UK_COASTLINE.ireland);

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
        <div className="relative w-full bg-[#1a3a5c]" style={{ height: '600px' }}>
          {/* UK Map SVG - Geographically accurate */}
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Sea background */}
            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#1a3a5c" />
            
            {/* Grid for reference (subtle) */}
            <defs>
              <pattern id="grid" width="18" height="27" patternUnits="userSpaceOnUse">
                <path d="M 18 0 L 0 0 0 27" fill="none" stroke="#ffffff" strokeWidth="0.1" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Ireland (context - faded) */}
            <path
              d={irelandPath}
              fill="#1a3d2e"
              stroke="#2d5a4a"
              strokeWidth="0.5"
              opacity="0.3"
            />

            {/* Scotland */}
            <path
              d={scotlandPath}
              {...getRegionStyle('scotland')}
              className="transition-all duration-300"
            />
            <path
              d={hebridesPath}
              {...getRegionStyle('scotland')}
              className="transition-all duration-300"
            />
            <path
              d={orkneyPath}
              {...getRegionStyle('scotland')}
              className="transition-all duration-300"
            />

            {/* Northern England */}
            <path
              d={northPath}
              {...getRegionStyle('north')}
              className="transition-all duration-300"
            />

            {/* Wales */}
            <path
              d={walesPath}
              {...getRegionStyle('wales')}
              className="transition-all duration-300"
            />

            {/* Midlands */}
            <path
              d={midlandsPath}
              {...getRegionStyle('midlands')}
              className="transition-all duration-300"
            />

            {/* Southern England */}
            <path
              d={southPath}
              {...getRegionStyle('south')}
              className="transition-all duration-300"
            />

            {/* City reference points */}
            {cities.map((city) => (
              <g key={city.name}>
                <circle
                  cx={city.svg.x}
                  cy={city.svg.y}
                  r="1.5"
                  fill="#ffffff"
                  opacity="0.5"
                />
                <text
                  x={city.svg.x + 3}
                  y={city.svg.y + 1}
                  fill="#ffffff"
                  fontSize="5"
                  opacity="0.6"
                  className="pointer-events-none"
                >
                  {city.name}
                </text>
              </g>
            ))}

            {/* Region labels */}
            <text x="95" y="55" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="600" opacity={selectedRegion === 'scotland' || selectedRegion === 'all' ? 0.85 : 0.25} className="pointer-events-none">
              SCOTLAND
            </text>
            <text x="115" y="115" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="600" opacity={selectedRegion === 'north' || selectedRegion === 'all' ? 0.85 : 0.25} className="pointer-events-none">
              NORTH
            </text>
            <text x="55" y="175" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="600" opacity={selectedRegion === 'wales' || selectedRegion === 'all' ? 0.85 : 0.25} className="pointer-events-none">
              WALES
            </text>
            <text x="120" y="165" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="600" opacity={selectedRegion === 'midlands' || selectedRegion === 'all' ? 0.85 : 0.25} className="pointer-events-none">
              MIDLANDS
            </text>
            <text x="130" y="215" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="600" opacity={selectedRegion === 'south' || selectedRegion === 'all' ? 0.85 : 0.25} className="pointer-events-none">
              SOUTH
            </text>
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
