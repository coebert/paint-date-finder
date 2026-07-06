/// <reference types="google.maps" />
import { format, parseISO } from 'date-fns';
import type { Renderer } from '@googlemaps/markerclusterer';
import type { PaintballEvent } from '@/types/events';
import type { UKRegion } from '@/lib/venueCoordinates';

export interface VenueGroup {
  name: string;
  lat: number;
  lng: number;
  region: UKRegion;
  location: string;
  events: PaintballEvent[];
}

/**
 * Higher number = more important. Competitions/tournaments float above
 * walk-ons so they stay clickable when markers overlap inside a cluster.
 */
export const EVENT_TYPE_PRIORITY: Record<string, number> = {
  competition: 3,
  tournament: 3,
  big_game: 2,
  scenario: 1,
  mag_fed: 1,
  speedball: 1,
  walk_on: 0,
  other: 0,
};

export function venuePriority(group: VenueGroup): number {
  let max = 0;
  for (const e of group.events) {
    const p = EVENT_TYPE_PRIORITY[e.event_type] ?? 0;
    if (p > max) max = p;
  }
  return max;
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** Themed cluster bubble: olive base, orange when very dense. */
export const clusterRenderer: Renderer = {
  render: ({ count, position }) => {
    const g = (window as unknown as { google: typeof google }).google;
    const size = count < 10 ? 40 : count < 25 ? 48 : count < 50 ? 56 : 64;
    const fill =
      count < 10 ? '#8a9a5b' : count < 25 ? '#a8a247' : count < 50 ? '#d97706' : '#c2410c';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${fill}" fill-opacity="0.35"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 8}" fill="${fill}" stroke="#0f1408" stroke-width="2"/>
    </svg>`;
    return new g.maps.Marker({
      position,
      icon: {
        url: `data:image/svg+xml;base64,${btoa(svg)}`,
        scaledSize: new g.maps.Size(size, size),
        anchor: new g.maps.Point(size / 2, size / 2),
      },
      label: {
        text: String(count),
        color: '#0f1408',
        fontSize: '13px',
        fontWeight: '800',
      },
      title: `${count} venues — click to zoom in`,
      zIndex: 1000 + count,
    });
  },
};

/** Build a venue marker icon; hover state enlarges + brightens the ring. */
export function getMarkerIcon(priority: number, hovered: boolean): google.maps.Icon {
  const g = (window as unknown as { google: typeof google }).google;
  const isHighPriority = priority >= 2;
  const baseSize = isHighPriority ? 44 : 32;
  const size = hovered ? baseSize + 10 : baseSize;
  const fill = priority >= 3 ? '#d97706' : priority === 2 ? '#c2410c' : '#8a9a5b';
  const opacity = hovered ? '0.55' : '0.3';
  const outlineColor = hovered ? '#f4f1e8' : '#0f1408';
  const outlineWidth = hovered ? 3 : 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${fill}" fill-opacity="${opacity}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" fill="${fill}" stroke="${outlineColor}" stroke-width="${outlineWidth}"/>
    ${hovered ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="none" stroke="#f4f1e8" stroke-width="1.5" stroke-opacity="0.6"/>` : ''}
  </svg>`;
  return {
    url: `data:image/svg+xml;base64,${btoa(svg)}`,
    scaledSize: new g.maps.Size(size, size),
    anchor: new g.maps.Point(size / 2, size / 2),
  };
}

/** InfoWindow HTML for a clicked venue. Inline styles kept to survive the SDK's iframe context. */
export function buildInfoWindowHtml(
  group: VenueGroup,
  venueDetails: Map<string, { website: string | null }> | undefined,
): string {
  const website = venueDetails?.get(group.name)?.website ?? null;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${group.lat},${group.lng}`;

  const sorted = [...group.events].sort((a, b) => {
    const pa = EVENT_TYPE_PRIORITY[a.event_type] ?? 0;
    const pb = EVENT_TYPE_PRIORITY[b.event_type] ?? 0;
    if (pa !== pb) return pb - pa;
    return a.event_date.localeCompare(b.event_date);
  });
  const items = sorted
    .slice(0, 8)
    .map((e) => {
      let dateLabel = e.event_date;
      try {
        dateLabel = format(parseISO(e.event_date), 'EEE d MMM yyyy');
      } catch {
        /* keep raw */
      }
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
    })
    .join('');

  const more =
    sorted.length > 8
      ? `<div style="font-size:11px;color:#b5b09c;margin-top:6px">+ ${sorted.length - 8} more</div>`
      : '';

  return `
    <div data-event-map-info style="font-family:inherit;color:#f4f1e8;min-width:240px;max-width:300px">
      <div style="font-weight:700;font-size:14px;line-height:1.25;margin-bottom:2px">${escapeHtml(group.name)}</div>
      <div style="font-size:11px;color:#b5b09c;margin-bottom:8px">${escapeHtml(group.location)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <a href="${directions}" target="_blank" rel="noopener"
          style="font-size:11px;padding:4px 8px;border-radius:6px;background:#8a9a5b;color:#0f1408;text-decoration:none;font-weight:600">
          Directions
        </a>
        ${
          website
            ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener"
          style="font-size:11px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.08);color:#f4f1e8;text-decoration:none;font-weight:600">
          Website
        </a>`
            : ''
        }
      </div>
      <ul style="list-style:none;margin:0;padding:0">${items}</ul>
      ${more}
    </div>`;
}
