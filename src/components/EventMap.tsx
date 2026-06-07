/// <reference types="google.maps" />
import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { VENUE_COORDINATES, type UKRegion } from '@/lib/venueCoordinates';
import { useVenueDetails } from '@/hooks/useVenueDetails';

export type { UKRegion };

const REGION_LABELS: Record<UKRegion, string> = {
  all: 'All UK',
  scotland: 'Scotland',
  north: 'North',
  midlands: 'Midlands',
  south: 'South',
  wales: 'Wales',
};

const UK_CENTER = { lat: 54.5, lng: -3.0 };
const UK_ZOOM = 6;

// Dark map style aligned with the app's tactical aesthetic.
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f2117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca38a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3d2c' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#5a5e44' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2d20' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1a2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3b6fa0' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#262a1c' }] },
];

let mapsLoadingPromise: Promise<typeof google> | null = null;

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsLoadingPromise) return mapsLoadingPromise;

  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const trackingId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!browserKey) return Promise.reject(new Error('Missing Google Maps browser key'));

  mapsLoadingPromise = new Promise((resolve, reject) => {
    const cbName = `__initGoogleMaps_${Math.random().toString(36).slice(2)}`;
    (window as any)[cbName] = () => {
      delete (window as any)[cbName];
      resolve((window as any).google);
    };

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: browserKey,
      loading: 'async',
      callback: cbName,
      libraries: 'marker',
    });
    if (trackingId) params.set('channel', trackingId);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapsLoadingPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return mapsLoadingPromise;
}

interface EventMapProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

interface VenueGroup {
  name: string;
  lat: number;
  lng: number;
  region: UKRegion;
  location: string;
  events: PaintballEvent[];
}

export function EventMap({ events, onEventClick }: EventMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const onEventClickRef = useRef(onEventClick);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<UKRegion>('all');
  const { data: venueDetails } = useVenueDetails();

  useEffect(() => {
    onEventClickRef.current = onEventClick;
  }, [onEventClick]);

  const venueGroups = useMemo<VenueGroup[]>(() => {
    const byVenue = new Map<string, PaintballEvent[]>();
    for (const e of events) {
      if (!byVenue.has(e.venue_name)) byVenue.set(e.venue_name, []);
      byVenue.get(e.venue_name)!.push(e);
    }
    const groups: VenueGroup[] = [];
    for (const [name, venueEvents] of byVenue) {
      const coords = VENUE_COORDINATES[name];
      if (!coords) continue;
      groups.push({
        name,
        lat: coords.lat,
        lng: coords.lng,
        region: coords.region,
        location: coords.location,
        events: venueEvents,
      });
    }
    return groups;
  }, [events]);

  const filteredGroups = useMemo(
    () => (selectedRegion === 'all' ? venueGroups : venueGroups.filter(g => g.region === selectedRegion)),
    [venueGroups, selectedRegion],
  );

  // Init map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(g => {
        if (cancelled || !mapContainerRef.current) return;
        const map = new g.maps.Map(mapContainerRef.current, {
          center: UK_CENTER,
          zoom: UK_ZOOM,
          styles: DARK_MAP_STYLES,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          backgroundColor: '#1f2117',
          restriction: {
            latLngBounds: { north: 61, south: 49, west: -11, east: 3 },
            strictBounds: false,
          },
        });
        mapRef.current = map;
        infoWindowRef.current = new g.maps.InfoWindow({ maxWidth: 320 });
        setStatus('ready');
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[EventMap] Google Maps failed to load', err);
        setErrorMsg(err?.message ?? 'Failed to load map');
        setStatus('error');
      });
    return () => {
      cancelled = true;
      clustererRef.current?.clearMarkers();
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
    };
  }, []);

  // Build / rebuild markers when groups change.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    const g = (window as any).google as typeof google;

    clustererRef.current?.clearMarkers();
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const markers = filteredGroups.map(group => {
      const marker = new g.maps.Marker({
        position: { lat: group.lat, lng: group.lng },
        title: `${group.name} — ${group.events.length} event${group.events.length === 1 ? '' : 's'}`,
        label: group.events.length > 1
          ? { text: String(group.events.length), color: '#0f1408', fontSize: '11px', fontWeight: '700' }
          : undefined,
      });
      marker.addListener('click', () => {
        if (!mapRef.current || !infoWindowRef.current) return;
        infoWindowRef.current.setContent(buildInfoWindowHtml(group, venueDetails));
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });

        // Wire up event-click handlers in the rendered HTML.
        google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
          const root = document.querySelector('[data-event-map-info]');
          root?.querySelectorAll<HTMLElement>('[data-event-id]').forEach(el => {
            el.addEventListener('click', ev => {
              ev.preventDefault();
              const id = el.dataset.eventId;
              const target = group.events.find(e => e.id === id);
              if (target && onEventClickRef.current) onEventClickRef.current(target);
            });
          });
        });
      });
      return marker;
    });

    markersRef.current = markers;

    clustererRef.current = new MarkerClusterer({
      map: mapRef.current,
      markers,
    });

    // Fit bounds to filtered markers when a region is chosen.
    if (selectedRegion !== 'all' && markers.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      markers.forEach(m => {
        const pos = m.getPosition();
        if (pos) bounds.extend(pos);
      });
      mapRef.current.fitBounds(bounds, 48);
    } else {
      mapRef.current.setCenter(UK_CENTER);
      mapRef.current.setZoom(UK_ZOOM);
    }
  }, [status, filteredGroups, selectedRegion, venueDetails]);

  const totalEvents = filteredGroups.reduce((sum, g) => sum + g.events.length, 0);

  return (
    <div className="space-y-6">
      {/* Region Filter */}
      <div className="bg-card border border-border/50 rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Region:</span>
          <ToggleGroup
            type="single"
            value={selectedRegion}
            onValueChange={v => v && setSelectedRegion(v as UKRegion)}
            className="flex-wrap"
          >
            {(Object.keys(REGION_LABELS) as UKRegion[]).map(region => (
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
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredGroups.length} venue{filteredGroups.length === 1 ? '' : 's'} · {totalEvents} event{totalEvents === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden relative">
        <div ref={mapContainerRef} className="w-full" style={{ height: '600px' }} />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 animate-pulse" />
              Loading map…
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80 p-6 text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-sm font-medium text-foreground">Map unavailable</p>
              <p className="text-xs text-muted-foreground">{errorMsg ?? 'Google Maps could not be loaded.'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function buildInfoWindowHtml(
  group: VenueGroup,
  venueDetails: Map<string, { website: string | null }> | undefined,
): string {
  const website = venueDetails?.get(group.name)?.website ?? null;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${group.lat},${group.lng}`;

  const sorted = [...group.events].sort((a, b) => a.event_date.localeCompare(b.event_date));
  const items = sorted.slice(0, 8).map(e => {
    let dateLabel = e.event_date;
    try {
      dateLabel = format(parseISO(e.event_date), 'EEE d MMM yyyy');
    } catch { /* keep raw */ }
    const time = e.start_time ? ` · ${e.start_time.slice(0, 5)}` : '';
    const bookLink = e.booking_url
      ? `<a href="${escapeHtml(e.booking_url)}" target="_blank" rel="noopener"
            style="display:inline-block;margin-top:6px;font-size:11px;padding:3px 8px;border-radius:6px;background:#d97706;color:#0f1408;text-decoration:none;font-weight:700">
            Book ↗
          </a>`
      : '';
    return `
      <li style="margin:0;padding:8px 0;border-top:1px solid rgba(255,255,255,0.08)">
        <button data-event-id="${escapeHtml(e.id)}"
          style="background:none;border:0;padding:0;text-align:left;cursor:pointer;color:inherit;font:inherit;width:100%">
          <div style="font-weight:600;color:#f4f1e8;font-size:13px;line-height:1.3">${escapeHtml(e.title)}</div>
          <div style="font-size:11px;color:#b5b09c;margin-top:2px">${escapeHtml(dateLabel)}${escapeHtml(time)}</div>
        </button>
        ${bookLink}
      </li>`;
  }).join('');

  const more = sorted.length > 8 ? `<div style="font-size:11px;color:#b5b09c;margin-top:6px">+ ${sorted.length - 8} more</div>` : '';

  return `
    <div data-event-map-info style="font-family:inherit;color:#f4f1e8;min-width:240px;max-width:300px">
      <div style="font-weight:700;font-size:14px;line-height:1.25;margin-bottom:2px">${escapeHtml(group.name)}</div>
      <div style="font-size:11px;color:#b5b09c;margin-bottom:8px">${escapeHtml(group.location)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <a href="${directions}" target="_blank" rel="noopener"
          style="font-size:11px;padding:4px 8px;border-radius:6px;background:#8a9a5b;color:#0f1408;text-decoration:none;font-weight:600">
          Directions
        </a>
        ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener"
          style="font-size:11px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.08);color:#f4f1e8;text-decoration:none;font-weight:600">
          Website
        </a>` : ''}
      </div>
      <ul style="list-style:none;margin:0;padding:0">${items}</ul>
      ${more}
    </div>`;
}

// Suppress unused import warnings for icons referenced indirectly during JSX edits.
void EventTypeBadge; void Button; void Calendar; void ExternalLink; void Navigation;
