import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Navigation, X } from 'lucide-react';
import { geocodeUK, GeocodeError } from '@/lib/geocode';
import type { useUserLocation } from '@/hooks/useUserLocation';

type Loc = ReturnType<typeof useUserLocation>;

interface NearMeFilterProps {
  location: Loc;
  hiddenNoCoords?: number;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200] as const;

export function NearMeFilter({ location, hiddenNoCoords = 0 }: NearMeFilterProps) {
  const {
    coords,
    status,
    error,
    radiusMiles,
    source,
    label,
    setRadiusMiles,
    request,
    setManualLocation,
    clear,
  } = location;

  const [placeQuery, setPlaceQuery] = useState('');
  const [placeStatus, setPlaceStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [placeError, setPlaceError] = useState<string | null>(null);

  const radiusActive = !!coords;

  const onSubmitPlace = async (e: FormEvent) => {
    e.preventDefault();
    const q = placeQuery.trim();
    if (!q) return;
    setPlaceStatus('loading');
    setPlaceError(null);
    try {
      const result = await geocodeUK(q);
      setManualLocation(result.coords, result.label);
      setPlaceStatus('idle');
    } catch (err) {
      setPlaceStatus('error');
      setPlaceError(err instanceof Error ? err.message : 'Could not find that location.');
    }
  };

  const onClear = () => {
    clear();
    setPlaceQuery('');
    setPlaceError(null);
    setPlaceStatus('idle');
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3">
      {!radiusActive ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={request}
            disabled={status === 'loading'}
            className="gap-2"
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Use my GPS
          </Button>
          <span className="text-xs text-muted-foreground">or</span>
          <form onSubmit={onSubmitPlace} className="flex flex-1 items-center gap-2 min-w-[220px]">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                placeholder="Postcode or town (e.g. SW1A 1AA, Bristol)"
                className="pl-9 h-9 bg-input border-border"
                aria-label="Postcode or town"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={placeStatus === 'loading' || !placeQuery.trim()}
              className="gap-2"
            >
              {placeStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Set
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            <MapPin className="h-3.5 w-3.5" />
            Within {radiusMiles} mi of {source === 'manual' && label ? label : 'you'}
          </span>
          <Select value={String(radiusMiles)} onValueChange={(v) => setRadiusMiles(Number(v))}>
            <SelectTrigger className="h-8 w-[120px] bg-input border-border" aria-label="Radius">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r} miles
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={onClear} className="h-8 gap-1 text-xs">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
          {hiddenNoCoords > 0 && (
            <span className="text-xs text-muted-foreground">
              {hiddenNoCoords} hidden — venue location unknown
            </span>
          )}
        </div>
      )}
      {(error || placeError) && (
        <span className="text-xs text-destructive">{placeError || error}</span>
      )}
    </div>
  );
}
