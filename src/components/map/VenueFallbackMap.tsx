import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { ExternalLink, MapPin } from 'lucide-react';
import ukGeo from '@/assets/geo/GBR.geo.json';
import type { PaintballEvent } from '@/types/events';
import type { VenueGroup } from '@/lib/eventMapMarkers';
import { Button } from '@/components/ui/button';

const WIDTH = 400;
const HEIGHT = 600;
const geo = ukGeo as unknown as FeatureCollection;

interface Props {
  groups: VenueGroup[];
  onEventClick?: (event: PaintballEvent) => void;
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
}

export function mapsSearchUrl(g: Pick<VenueGroup, 'lat' | 'lng' | 'name'>) {
  return `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`;
}

/** Self-drawn UK venue map used when Google Maps can't load. */
export function VenueFallbackMap({ groups, onEventClick }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { path, project } = useMemo(() => {
    const projection = geoMercator().fitSize([WIDTH, HEIGHT], geo);
    return { path: geoPath(projection), project: projection };
  }, []);

  const sorted = useMemo(() => [...groups].sort((a, b) => a.name.localeCompare(b.name)), [groups]);
  const active = sorted.find((g) => g.name === selected) ?? null;

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 p-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-h-[600px]"
        role="img"
        aria-label="Map of UK paintball venues"
      >
        {geo.features.map((f, i) => (
          <path key={i} d={path(f) ?? ''} className="fill-muted stroke-border" strokeWidth={1} />
        ))}
        {sorted.map((g) => {
          const pt = project([g.lng, g.lat]);
          if (!pt) return null;
          const isActive = g.name === selected;
          return (
            <circle
              key={g.name}
              cx={pt[0]}
              cy={pt[1]}
              r={isActive ? 8 : 5}
              tabIndex={0}
              role="button"
              aria-label={`${g.name}, ${g.events.length} events`}
              className={`cursor-pointer stroke-background ${isActive ? 'fill-accent' : 'fill-primary'} focus:outline-none focus-visible:fill-accent`}
              strokeWidth={1.5}
              onClick={() => setSelected(g.name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(g.name);
                }
              }}
            >
              <title>{g.name}</title>
            </circle>
          );
        })}
      </svg>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {active ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{active.name}</h3>
                {active.location && <p className="text-xs text-muted-foreground">{active.location}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                All venues
              </Button>
            </div>
            <a
              href={mapsSearchUrl(active)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open in Google Maps <ExternalLink className="h-3 w-3" />
            </a>
            <ul className="space-y-1">
              {active.events.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded-md border border-border/50 px-3 py-2 min-h-11 hover:bg-muted"
                    onClick={() => onEventClick?.(e)}
                  >
                    <span className="block text-sm text-foreground">{e.title}</span>
                    <span className="block text-xs text-muted-foreground">{formatDate(e.event_date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No venues with events in this area.</p>
        ) : (
          <ul className="space-y-1">
            {sorted.map((g) => (
              <li key={g.name}>
                <button
                  type="button"
                  className="w-full text-left rounded-md px-3 py-2 min-h-11 hover:bg-muted flex items-center gap-2"
                  onClick={() => setSelected(g.name)}
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground flex-1">{g.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.events.length} {g.events.length === 1 ? 'event' : 'events'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
