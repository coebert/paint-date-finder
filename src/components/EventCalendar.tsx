import { useState, useMemo } from 'react';
import { PaintballEvent, EVENT_TYPE_LABELS, EventType } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Calendar, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
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
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

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
      <div className="flex items-center justify-between p-4 border-b border-border/50 tactical-gradient">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevMonth}
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
          className="text-foreground hover:bg-primary/20"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
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
          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="border border-dashed border-muted-foreground/30 rounded px-1.5 py-0.5 opacity-60">Unverified</span>
        </div>
        <span className="hidden sm:inline text-border">|</span>
        {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm bg-event-${type.replace('_', '-')}`} />
            <span>{label}</span>
          </div>
        ))}
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
                    <EventTypeBadge type={event.event_type} />
                    {event.is_verified ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
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
                    <p className="text-[10px] text-muted-foreground/50 italic mt-1">Unverified</p>
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
