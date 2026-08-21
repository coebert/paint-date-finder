import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { PaintballEvent } from '@/types/events';
import { useFlaggedEventIds } from '@/hooks/useEventFlags';
import type { LatLng } from '@/lib/geo';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarDayCell } from './calendar/CalendarDayCell';
import { CalendarLegend } from './calendar/CalendarLegend';
import { ExpandedDayPanel } from './calendar/ExpandedDayPanel';
import { EventAgenda } from './calendar/EventAgenda';
import { CalendarWeekView } from './calendar/CalendarWeekView';
import type { CalendarViewMode } from './calendar/CalendarViewToggle';
import { useIsMobile } from '@/hooks/use-mobile';

const MODE_KEY = 'faw:calendar-mode';

interface EventCalendarProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
  userCoords?: LatLng | null;
}

function readStoredMode(): CalendarViewMode | null {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return raw === 'month' || raw === 'week' || raw === 'agenda' ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Presentation-only calendar with month, week and agenda views. Filters are the
 * page's responsibility — this component just renders the events it's given.
 */
export function EventCalendar({ events, onEventClick, userCoords }: EventCalendarProps) {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const { data: flaggedIds } = useFlaggedEventIds();
  const isMobile = useIsMobile();

  const [mode, setMode] = useState<CalendarViewMode>(() => readStoredMode() ?? 'month');
  const [hasStoredMode] = useState(() => readStoredMode() !== null);

  // Agenda is the sensible default on small screens unless the user chose otherwise.
  useEffect(() => {
    if (isMobile && !hasStoredMode) setMode('agenda');
  }, [isMobile, hasStoredMode]);

  const handleModeChange = (next: CalendarViewMode) => {
    setMode(next);
    setExpandedDate(null);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // ignore private mode / quota
    }
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PaintballEvent[]>();
    for (const event of events) {
      const list = map.get(event.event_date);
      if (list) list.push(event);
      else map.set(event.event_date, [event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    }
    return map;
  }, [events]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(anchorDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorDate]);

  const handleDateClick = (dateKey: string, hasEvents: boolean) => {
    if (hasEvents) {
      setExpandedDate(expandedDate === dateKey ? null : dateKey);
    }
  };

  const expandedEvents = expandedDate ? eventsByDate.get(expandedDate) ?? [] : [];

  const title =
    mode === 'month'
      ? format(anchorDate, 'MMMM yyyy')
      : mode === 'week'
        ? isSameMonth(weekDays[0], weekDays[6])
          ? `${format(weekDays[0], 'd')} – ${format(weekDays[6], 'd MMM yyyy')}`
          : `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM yyyy')}`
        : 'Upcoming events';

  const goPrev = () =>
    setAnchorDate((d) => (mode === 'week' ? subWeeks(d, 1) : subMonths(d, 1)));
  const goNext = () =>
    setAnchorDate((d) => (mode === 'week' ? addWeeks(d, 1) : addMonths(d, 1)));

  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
      <CalendarHeader
        title={title}
        mode={mode}
        onModeChange={handleModeChange}
        onPrev={goPrev}
        onNext={goNext}
        onToday={() => setAnchorDate(new Date())}
        showNav={mode !== 'agenda'}
        navLabel={mode === 'week' ? 'week' : 'month'}
      />

      {mode === 'agenda' && (
        <div className="p-4">
          <EventAgenda events={events} onEventClick={onEventClick} />
        </div>
      )}

      {mode === 'week' && (
        <CalendarWeekView
          days={weekDays}
          eventsByDate={eventsByDate}
          flaggedIds={flaggedIds}
          onEventClick={onEventClick}
        />
      )}

      {mode === 'month' && (
        <>
          <div className="hidden sm:grid grid-cols-7 border-b border-border/50">
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
            {monthDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              return (
                <CalendarDayCell
                  key={dateKey}
                  day={day}
                  currentMonth={anchorDate}
                  dayEvents={eventsByDate.get(dateKey) ?? []}
                  isExpanded={expandedDate === dateKey}
                  flaggedIds={flaggedIds}
                  onDateClick={handleDateClick}
                  onEventClick={onEventClick}
                />
              );
            })}
          </div>
        </>
      )}

      {mode !== 'agenda' && <CalendarLegend />}

      {mode === 'month' && expandedDate && expandedEvents.length > 0 && (
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
