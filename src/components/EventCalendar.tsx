import { useState, useMemo } from 'react';
import { PaintballEvent } from '@/types/events';
import { EventTypeBadge } from './EventTypeBadge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

          return (
            <div
              key={idx}
              className={cn(
                'calendar-day',
                !isCurrentMonth && 'opacity-40',
                dayEvents.length > 0 && 'has-events',
                isDayToday && 'today'
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
                    onClick={() => onEventClick?.(event)}
                    className="w-full text-left"
                  >
                    <div
                      className={cn(
                        'text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity',
                        event.event_type === 'walk_on' && 'bg-event-walk-on/80 text-white',
                        event.event_type === 'big_game' && 'bg-event-big-game/80 text-black',
                        event.event_type === 'competition' && 'bg-event-competition/80 text-white',
                        event.event_type === 'tournament' && 'bg-event-tournament/80 text-white',
                        event.event_type === 'speedball' && 'bg-event-speedball/80 text-white',
                        event.event_type === 'scenario' && 'bg-event-scenario/80 text-black',
                        event.event_type === 'other' && 'bg-event-other/80 text-white'
                      )}
                    >
                      {event.title}
                    </div>
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-accent font-medium">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
