import { useState, useMemo } from 'react';
import { PaintballEvent, EVENT_TYPE_LABELS, EventType } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { useFlaggedEventIds } from '@/hooks/useEventFlags';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface EventCalendarProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
  eventType?: EventType;
  venue?: string;
  venues?: string[];
  onEventTypeChange?: (type: EventType | undefined) => void;
  onVenueChange?: (venue: string) => void;
}

export function EventCalendar({
  events,
  onEventClick,
  eventType,
  venue,
  venues,
  onEventTypeChange,
  onVenueChange,
}: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const { data: flaggedIds } = useFlaggedEventIds();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PaintballEvent[]>();
    events.forEach((event) => {
      const dateKey = event.event_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDateClick = (dateKey: string, hasEvents: boolean) => {
    if (hasEvents) {
      setExpandedDate(expandedDate === dateKey ? null : dateKey);
    }
  };

  const expandedEvents = expandedDate ? eventsByDate.get(expandedDate) || [] : [];

  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 tactical-gradient space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            aria-label="Previous month"
            className="text-foreground hover:bg-primary/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-display text-2xl tracking-wider text-foreground">
            {format(currentMonth, 'MMMM yyyy').toUpperCase()}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            aria-label="Next month"
            className="text-foreground hover:bg-primary/20"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Inline filters */}
        {(onEventTypeChange || onVenueChange) && (
          <div className="flex flex-wrap items-center gap-2">
            {onEventTypeChange && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onEventTypeChange(undefined)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide transition-colors',
                    !eventType
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  )}
                >
                  All
                </button>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onEventTypeChange(eventType === type ? undefined : type)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide transition-colors',
                      eventType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    )}
                  >
                    {EVENT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            )}

            {onVenueChange && venues && venues.length > 0 && (
              <div className="ml-auto">
                <Select
                  value={venue || 'all'}
                  onValueChange={(value) => onVenueChange(value === 'all' ? '' : value)}
                >
                  <SelectTrigger
                    className="h-8 min-w-[140px] w-fit bg-input border-border text-xs"
                    aria-label="Filter by venue"
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-accent shrink-0" />
                      <SelectValue placeholder="All Venues" />
                    </div>
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
            )}
          </div>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-semibold text-muted-foreground bg-secondary/50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          const isExpanded = expandedDate === dateKey;
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={idx}
              onClick={() => handleDateClick(dateKey, hasEvents)}
              className={cn(
                'calendar-day relative',
                !isCurrentMonth && 'opacity-40',
                hasEvents && 'has-events cursor-pointer',
                isDayToday && 'today',
                isExpanded && 'ring-2 ring-accent ring-inset bg-accent/10 z-10'
              )}
            >
              <span
                className={cn(
                  'text-sm font-medium',
                  isDayToday && 'text-accent'
                )}
              >
                {format(day, 'd')}
              </span>

              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className="w-full text-left"
                  >
                    <div
                      className={cn(
                        'text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-0.5',
                        event.event_type === 'walk_on' && 'bg-event-walk-on/80 text-white',
                        event.event_type === 'big_game' && 'bg-event-big-game/80 text-black',
                        event.event_type === 'competition' && 'bg-event-competition/80 text-white',
                        event.event_type === 'tournament' && 'bg-event-tournament/80 text-white',
                        event.event_type === 'speedball' && 'bg-event-speedball/80 text-white',
                        event.event_type === 'scenario' && 'bg-event-scenario/80 text-black',
                        event.event_type === 'other' && 'bg-event-other/80 text-white',
                        !event.is_verified && 'opacity-60 border border-dashed border-current'
                      )}
                    >
                      {flaggedIds?.has(event.id) && (
                        <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      <span className="truncate">{event.title}</span>
                    </div>
                  </button>
                ))}
                {dayEvents.length > 2 && !isExpanded && (
                  <div className="text-xs text-accent font-medium hover:underline">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-t border-border/50 bg-secondary/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="border border-border/50 rounded px-1.5 py-0.5">Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="border border-dashed border-muted-foreground/30 rounded px-1.5 py-0.5 opacity-60">Unverified</span>
        </div>
        <span className="hidden sm:inline text-border">|</span>
        {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([type, label]) => {
          const colorMap: Record<EventType, string> = {
            walk_on: 'bg-event-walk-on',
            big_game: 'bg-event-big-game',
            competition: 'bg-event-competition',
            tournament: 'bg-event-tournament',
            speedball: 'bg-event-speedball',
            scenario: 'bg-event-scenario',
            mag_fed: 'bg-event-mag-fed',
            other: 'bg-event-other',
          };
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${colorMap[type]}`} />
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Expanded Date Panel */}
      {expandedDate && expandedEvents.length > 0 && (
        <div className="border-t border-border/50 bg-secondary/30 animate-in slide-in-from-top-2 duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <h3 className="font-display text-lg text-foreground">
                  {format(parseISO(expandedDate), 'EEEE, d MMMM yyyy')}
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({expandedEvents.length} event{expandedEvents.length !== 1 ? 's' : ''})
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpandedDate(null)}
                aria-label="Close day events"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {expandedEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className={cn(
                    "p-3 bg-card rounded-lg border cursor-pointer hover:border-accent/50 transition-colors",
                    event.is_verified ? "border-border/50" : "border-dashed border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <EventTypeBadge type={event.event_type} />
                      {flaggedIds?.has(event.id) && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                    </div>
                    {event.is_verified ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{event.venue_name}</p>
                  {event.start_time && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3 text-accent" />
                      {event.start_time.slice(0, 5)}
                      {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                    </div>
                  )}
                  {event.price_info && (
                    <p className="text-xs font-medium text-primary mt-2">{event.price_info}</p>
                  )}
                  {!event.is_verified && (
                    <p className="text-[10px] text-muted-foreground italic mt-1">Unverified</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
