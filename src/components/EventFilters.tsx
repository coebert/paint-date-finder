import { useState } from 'react';
import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Check, ChevronDown, Filter, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventFiltersProps {
  eventType: EventType | undefined;
  venue: string;
  venues: string[];
  verifiedOnly: boolean;
  onEventTypeChange: (type: EventType | undefined) => void;
  onVenueChange: (venue: string) => void;
  onVerifiedOnlyChange: (verified: boolean) => void;
  onClearFilters: () => void;
}

export function EventFilters({
  eventType,
  venue,
  venues,
  verifiedOnly,
  onEventTypeChange,
  onVenueChange,
  onVerifiedOnlyChange,
  onClearFilters,
}: EventFiltersProps) {
  const [venueOpen, setVenueOpen] = useState(false);
  const hasFilters = eventType || venue || verifiedOnly;

  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <Filter className="h-5 w-5 text-accent" />
        <span className="font-display text-lg tracking-wide">FILTER EVENTS</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {hasFilters && (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
