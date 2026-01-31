import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, X } from 'lucide-react';

interface EventFiltersProps {
  eventType: EventType | undefined;
  venue: string;
  venues: string[];
  onEventTypeChange: (type: EventType | undefined) => void;
  onVenueChange: (venue: string) => void;
  onClearFilters: () => void;
}

export function EventFilters({
  eventType,
  venue,
  venues,
  onEventTypeChange,
  onVenueChange,
  onClearFilters,
}: EventFiltersProps) {
  const hasFilters = eventType || venue;

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
          <Select
            value={venue || 'all'}
            onValueChange={(value) => onVenueChange(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="All Venues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {venues.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
