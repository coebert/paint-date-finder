import { useState } from 'react';
import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Check, ChevronDown, Filter, MapPin, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventFiltersProps {
  eventType: EventType | undefined;
  venue: string;
  venues: string[];
  region: string;
  regions: string[];
  verifiedOnly: boolean;
  onEventTypeChange: (type: EventType | undefined) => void;
  onVenueChange: (venue: string) => void;
  onRegionChange: (region: string) => void;
  onVerifiedOnlyChange: (verified: boolean) => void;
  onClearFilters: () => void;
}

export function EventFilters({
  eventType,
  venue,
  venues,
  region,
  regions,
  verifiedOnly,
  onEventTypeChange,
  onVenueChange,
  onRegionChange,
  onVerifiedOnlyChange,
  onClearFilters,
}: EventFiltersProps) {
  const [venueOpen, setVenueOpen] = useState(false);
  const hasFilters = eventType || venue || region || verifiedOnly;

  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <Filter className="h-5 w-5 text-accent" />
        <span className="font-display text-lg tracking-wide">FILTER EVENTS</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Event Type</label>
          <Select
            value={eventType || 'all'}
            onValueChange={(value) => onEventTypeChange(value === 'all' ? undefined : value as EventType)}
          >
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            Region
          </label>
          <Select
            value={region || 'all'}
            onValueChange={(value) => onRegionChange(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Venue</label>
          <Popover open={venueOpen} onOpenChange={setVenueOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={venueOpen}
                className="w-full justify-between bg-input border-border font-normal h-10"
              >
                <span className="truncate">
                  {venue || 'All Venues'}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search venues..." />
                <CommandList>
                  <CommandEmpty>No venue found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="All Venues"
                      onSelect={() => {
                        onVenueChange('');
                        setVenueOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !venue ? "opacity-100" : "opacity-0")} />
                      All Venues
                    </CommandItem>
                    {venues.map((v) => (
                      <CommandItem
                        key={v}
                        value={v}
                        onSelect={() => {
                          onVenueChange(v);
                          setVenueOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", venue === v ? "opacity-100" : "opacity-0")} />
                        {v}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="verified-only"
              checked={verifiedOnly}
              onCheckedChange={onVerifiedOnlyChange}
            />
            <label htmlFor="verified-only" className="text-sm text-muted-foreground flex items-center gap-1 cursor-pointer whitespace-nowrap">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Verified only
            </label>
          </div>

          {hasFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
