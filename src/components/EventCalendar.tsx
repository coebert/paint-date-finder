import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { PaintballEvent } from '@/types/events';
import { useFlaggedEventIds } from '@/hooks/useEventFlags';
import type { LatLng } from '@/lib/geo';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarDayCell } from './calendar/CalendarDayCell';
import { CalendarLegend } from './calendar/CalendarLegend';
import { ExpandedDayPanel } from './calendar/ExpandedDayPanel';

interface EventCalendarProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
  userCoords?: LatLng | null;
}

/**
 * Presentation-only calendar. Filters are the page's responsibility — this
 * component just renders the events it's given.
 */
export function EventCalendar({ events, onEventClick, userCoords }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const { data: flaggedIds } = useFlaggedEventIds();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PaintballEvent[]>();
    for (const event of events) {
      const list = map.get(event.event_date);
      if (list) list.push(event);
      else map.set(event.event_date, [event]);
    }
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

  const handleDateClick = (dateKey: string, hasEvents: boolean) => {
    if (hasEvents) {
      setExpandedDate(expandedDate === dateKey ? null : dateKey);
    }
  };

  const expandedEvents = expandedDate ? eventsByDate.get(expandedDate) ?? [] : [];

  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
      <CalendarHeader
        currentMonth={currentMonth}
        onPrev={() => setCurrentMonth(subMonths(currentMonth, 1))}
        onNext={() => setCurrentMonth(addMonths(currentMonth, 1))}
      />

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

      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          return (
            <CalendarDayCell
              key={dateKey}
              day={day}
              currentMonth={currentMonth}
              dayEvents={eventsByDate.get(dateKey) ?? []}
              isExpanded={expandedDate === dateKey}
              flaggedIds={flaggedIds}
              onDateClick={handleDateClick}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>

      <CalendarLegend />

      {expandedDate && expandedEvents.length > 0 && (
        <ExpandedDayPanel
          date={expandedDate}
          events={expandedEvents}
          flaggedIds={flaggedIds}
          userCoords={userCoords}
          onClose={() => setExpandedDate(null)}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}
