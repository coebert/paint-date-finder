import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

// UK venue coordinates (approximate - in a real app these would come from geocoding)
const VENUE_COORDINATES: Record<string, [number, number]> = {
  'Delta Force Paintball - Cobham': [51.3297, -0.4069],
  'Mayhem Paintball': [51.7074, 0.2619],
  'Campaign Paintball': [52.7707, -1.2078],
  'National Paintball Fields - Birmingham': [52.4862, -1.8904],
  'Bedlam Paintball - Manchester': [53.4808, -2.2426],
  'Special Ops Paintball': [53.8008, -1.5491],
  'Skirmish Paintball - Nottingham': [52.9548, -1.1581],
  'Go Paintball London': [51.5074, -0.1278],
};

// Default UK center
const UK_CENTER: LatLngExpression = [53.5, -2.0];
const DEFAULT_ZOOM = 6;

// Fix for default marker icon in webpack/vite builds
const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface EventMapProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

interface VenueMarkerProps {
  venueName: string;
  coords: [number, number];
  venueEvents: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

function VenueMarker({ venueName, coords, venueEvents, onEventClick }: VenueMarkerProps) {
  return (
    <Marker position={coords} icon={markerIcon}>
      <Popup maxWidth={300}>
        <div className="p-2 space-y-3">
          <h3 className="font-bold text-lg">{venueName}</h3>
          <p className="text-sm text-gray-600">
            {venueEvents.length} upcoming event{venueEvents.length !== 1 ? 's' : ''}
          </p>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {venueEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onEventClick?.(event)}
              >
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-800 mb-1">
                  {event.event_type.replace('_', ' ')}
                </span>
                <p className="font-medium text-sm">{event.title}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(event.event_date), 'MMM d, yyyy')}
                </div>
                {event.start_time && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {event.start_time.slice(0, 5)}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {venueEvents.length > 5 && (
            <p className="text-xs text-gray-500 text-center">
              +{venueEvents.length - 5} more events
            </p>
          )}
          
          {venueEvents[0]?.booking_url && (
            <a 
              href={venueEvents[0].booking_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm font-medium"
            >
              Visit Venue
              <ExternalLink className="inline-block ml-2 h-3 w-3" />
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export function EventMap({ events, onEventClick }: EventMapProps) {
  // Group events by venue for markers
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

  const venueMarkers = useMemo(() => {
    return Object.entries(eventsByVenue)
      .filter(([venueName]) => VENUE_COORDINATES[venueName])
      .map(([venueName, venueEvents]) => ({
        venueName,
        coords: VENUE_COORDINATES[venueName],
        venueEvents,
      }));
  }, [eventsByVenue]);

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <MapContainer
        center={UK_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-[600px] w-full"
        style={{ background: '#1a1a1a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {venueMarkers.map(({ venueName, coords, venueEvents }) => (
          <VenueMarker
            key={venueName}
            venueName={venueName}
            coords={coords}
            venueEvents={venueEvents}
            onEventClick={onEventClick}
          />
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="p-4 border-t border-border/50 bg-secondary/30">
        <p className="text-sm text-muted-foreground text-center">
          Click on markers to see events at each venue • {venueMarkers.length} venues shown
        </p>
      </div>
    </div>
  );
}
