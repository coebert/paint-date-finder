/// <reference types="google.maps" />
import { PaintballEvent } from '@/types/events';
import { MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { VENUE_COORDINATES, type UKRegion } from '@/lib/venueCoordinates';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { useVenueGeo } from '@/hooks/useVenueGeo';
import { normalizeVenueName } from '@/lib/venueGeo';
import { DARK_MAP_STYLES, UK_CENTER, UK_ZOOM, loadGoogleMaps } from '@/lib/googleMaps';
import {
  buildInfoWindowHtml,
  clusterRenderer,
  getMarkerIcon,
  venuePriority,
  type VenueGroup,
} from '@/lib/eventMapMarkers';
import { MapRegionFilter } from './map/MapRegionFilter';
import { MapLegend } from './map/MapLegend';

export type { UKRegion };

interface EventMapProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
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

  const resolveCoords = useVenueGeo();

  const venueGroups = useMemo<VenueGroup[]>(() => {
    const byVenue = new Map<string, PaintballEvent[]>();
    for (const e of events) {
      const list = byVenue.get(e.venue_name);
      if (list) list.push(e);
      else byVenue.set(e.venue_name, [e]);
    }
    const groups: VenueGroup[] = [];
    for (const [name, venueEvents] of byVenue) {
      const coords = resolveCoords(name);
      if (!coords) continue;
      const meta = curatedMeta(name);
      groups.push({
        name,
        lat: coords.lat,
        lng: coords.lng,
        region: meta?.region ?? regionForCoords(coords.lat, coords.lng),
        location: meta?.location ?? venueDetails?.get(name)?.location ?? '',
        events: venueEvents,
      });
    }
    return groups;
  }, [events, resolveCoords, venueDetails]);

  const filteredGroups = useMemo(
    () =>
      selectedRegion === 'all'
        ? venueGroups
        : venueGroups.filter((g) => g.region === selectedRegion),
    [venueGroups, selectedRegion],
  );

  // Init map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
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
      .catch((err) => {
        if (cancelled) return;
        console.error('[EventMap] Google Maps failed to load', err);
        setErrorMsg(err?.message ?? 'Failed to load map');
        setStatus('error');
      });
    return () => {
      cancelled = true;
      clustererRef.current?.clearMarkers();
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
    };
  }, []);

  // Build / rebuild markers when groups change.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    const g = (window as unknown as { google: typeof google }).google;

    clustererRef.current?.clearMarkers();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const markers = filteredGroups.map((group) => {
      const priority = venuePriority(group);
      const isHighPriority = priority >= 2;
      const marker = new g.maps.Marker({
        position: { lat: group.lat, lng: group.lng },
        title: `${group.name} — ${group.events.length} event${group.events.length === 1 ? '' : 's'}${isHighPriority ? ' (featured)' : ''}`,
        icon: getMarkerIcon(priority, false),
        label:
          group.events.length > 1
            ? { text: String(group.events.length), color: '#0f1408', fontSize: '11px', fontWeight: '700' }
            : undefined,
        // Higher priority floats above overlapping markers, keeping it clickable.
        zIndex: 100 + priority * 100 + group.events.length,
        optimized: false,
      });

      marker.addListener('mouseover', () => {
        marker.setIcon(getMarkerIcon(priority, true));
        marker.setZIndex(1000 + priority * 100 + group.events.length);
      });
      marker.addListener('mouseout', () => {
        marker.setIcon(getMarkerIcon(priority, false));
        marker.setZIndex(100 + priority * 100 + group.events.length);
      });

      marker.addListener('click', () => {
        if (!mapRef.current || !infoWindowRef.current) return;
        infoWindowRef.current.setContent(buildInfoWindowHtml(group, venueDetails));
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });

        google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
          const root = document.querySelector('[data-event-map-info]');
          root?.querySelectorAll<HTMLElement>('[data-event-id]').forEach((el) => {
            el.addEventListener('click', (ev) => {
              ev.preventDefault();
              const id = el.dataset.eventId;
              const target = group.events.find((e) => e.id === id);
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
      renderer: clusterRenderer,
      onClusterClick: (_e, cluster, map) => {
        // Progressive reveal: zoom into the cluster bounds on click.
        if (cluster.bounds) map.fitBounds(cluster.bounds, 64);
      },
    });

    // Fit bounds to filtered markers when a region is chosen.
    if (selectedRegion !== 'all' && markers.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      markers.forEach((m) => {
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
      <MapRegionFilter
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        venueCount={filteredGroups.length}
        eventCount={totalEvents}
      />

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden relative">
        <div ref={mapContainerRef} className="w-full" style={{ height: '600px' }} />

        {status === 'ready' && <MapLegend />}

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
              <p className="text-xs text-muted-foreground">
                {errorMsg ?? 'Google Maps could not be loaded.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
