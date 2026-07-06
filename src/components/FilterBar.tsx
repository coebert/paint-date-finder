import { useMemo } from 'react';
import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { EventTypeChips } from '@/components/EventTypeChips';
import { NearMeFilter } from '@/components/NearMeFilter';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ChevronDown, MapPin, Navigation, ShieldCheck, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useUserLocation } from '@/hooks/useUserLocation';

type Loc = ReturnType<typeof useUserLocation>;

interface FilterBarProps {
  eventType: EventType | undefined;
  beginnerOnly: boolean;
  venue: string;
  venues: string[];
  region: string;
  regions: string[];
  verifiedOnly: boolean;
  location: Loc;
  hiddenNoCoords: number;
  onEventTypeChange: (t: EventType | undefined) => void;
  onBeginnerOnlyChange: (v: boolean) => void;
  onVenueChange: (v: string) => void;
  onRegionChange: (r: string) => void;
  onVerifiedOnlyChange: (v: boolean) => void;
  onClearAll: () => void;
}

export function FilterBar(props: FilterBarProps) {
  const {
    eventType,
    beginnerOnly,
    venue,
    venues,
    region,
    regions,
    verifiedOnly,
    location,
    hiddenNoCoords,
    onEventTypeChange,
    onBeginnerOnlyChange,
    onVenueChange,
    onRegionChange,
    onVerifiedOnlyChange,
    onClearAll,
  } = props;

  const nearMeActive = !!location.coords;
  const activeChips = useMemo(() => {
    const items: { key: string; label: string; onRemove: () => void }[] = [];
    if (eventType)
      items.push({
        key: 'type',
        label: EVENT_TYPE_LABELS[eventType],
        onRemove: () => onEventTypeChange(undefined),
      });
    if (beginnerOnly)
      items.push({
        key: 'beginner',
        label: 'Beginner-friendly',
        onRemove: () => onBeginnerOnlyChange(false),
      });
    if (region)
      items.push({ key: 'region', label: region, onRemove: () => onRegionChange('') });
    if (venue)
      items.push({ key: 'venue', label: venue, onRemove: () => onVenueChange('') });
    if (nearMeActive)
      items.push({
        key: 'near',
        label: `Within ${location.radiusMiles} mi${
          location.source === 'manual' && location.label ? ` of ${location.label}` : ''
        }`,
        onRemove: () => location.clear(),
      });
    if (!verifiedOnly)
      items.push({
        key: 'verified',
        label: 'Including unverified',
        onRemove: () => onVerifiedOnlyChange(true),
      });
    return items;
  }, [
    eventType,
    beginnerOnly,
    region,
    venue,
    nearMeActive,
    verifiedOnly,
    location.radiusMiles,
    location.source,
    location.label,
    onEventTypeChange,
    onBeginnerOnlyChange,
    onRegionChange,
    onVenueChange,
    onVerifiedOnlyChange,
    location,
  ]);

  const triggerClass =
    'h-9 gap-1.5 border-border/60 bg-card/70 backdrop-blur-sm text-sm font-normal';

  return (
    <div className="sticky top-16 z-30 -mx-4 border-y border-border/50 bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <EventTypeChips
              eventType={eventType}
              beginnerOnly={beginnerOnly}
              onEventTypeChange={onEventTypeChange}
              onBeginnerOnlyChange={onBeginnerOnlyChange}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Region */}
            <Select
              value={region || 'all'}
              onValueChange={(v) => onRegionChange(v === 'all' ? '' : v)}
            >
              <SelectTrigger
                className={cn(triggerClass, region && 'border-accent text-accent')}
                aria-label="Filter by region"
              >
                <MapPin className="h-3.5 w-3.5" />
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Venue */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(triggerClass, venue && 'border-accent text-accent')}
                  aria-label="Filter by venue"
                >
                  <span className="max-w-[9rem] truncate">{venue || 'Venue'}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search venues…" />
                  <CommandList>
                    <CommandEmpty>No venue found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="All venues"
                        onSelect={() => onVenueChange('')}
                      >
                        <Check
                          className={cn('mr-2 h-4 w-4', !venue ? 'opacity-100' : 'opacity-0')}
                        />
                        All venues
                      </CommandItem>
                      {venues.map((v) => (
                        <CommandItem key={v} value={v} onSelect={() => onVenueChange(v)}>
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              venue === v ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {v}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Near me */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="near-me"
                  variant="outline"
                  className={cn(triggerClass, nearMeActive && 'border-accent text-accent')}
                  aria-label="Filter by distance"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {nearMeActive ? `Within ${location.radiusMiles} mi` : 'Near me'}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[22rem] p-3" align="end">
                <NearMeFilter location={location} hiddenNoCoords={hiddenNoCoords} />
              </PopoverContent>
            </Popover>

            {/* Overflow */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn('h-9 w-9 border-border/60 bg-card/70 backdrop-blur-sm')}
                  aria-label="More filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={verifiedOnly}
                  onCheckedChange={onVerifiedOnlyChange}
                >
                  <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                  Verified only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={beginnerOnly}
                  onCheckedChange={onBeginnerOnlyChange}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-accent" />
                  Beginner-friendly
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={onClearAll}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all filters
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Active:
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent transition-colors hover:border-accent hover:bg-accent/20"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={onClearAll}
              className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
