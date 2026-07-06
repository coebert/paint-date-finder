import { useMemo } from 'react';
import { format, parseISO, nextSaturday, nextSunday, isSaturday, isSunday, startOfDay } from 'date-fns';
import { CalendarDays, MapPin, ChevronRight } from 'lucide-react';
import { PaintballEvent, EVENT_TYPE_META } from '@/types/events';
import { cn } from '@/lib/utils';

interface WeekendStripProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

/**
 * "Upcoming this weekend" — a compact horizontal scroller of Sat/Sun
 * events, surfaced above the main view so returning users see the
 * next thing to book without scanning the calendar.
 *
 * Only renders when there's at least one match; costs zero layout
 * space on quiet weeks.
 */
export function WeekendStrip({ events, onEventClick }: WeekendStripProps) {
  const weekendEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const sat = isSaturday(today) ? today : nextSaturday(today);
    const sun = isSunday(today) ? today : nextSunday(today);
    const satKey = format(sat, 'yyyy-MM-dd');
    const sunKey = format(sun, 'yyyy-MM-dd');
    return events
      .filter((e) => e.event_date === satKey || e.event_date === sunKey)
      .sort(
        (a, b) =>
          a.event_date.localeCompare(b.event_date) ||
          (a.start_time || '').localeCompare(b.start_time || ''),
      )
      .slice(0, 12);
  }, [events]);

  if (weekendEvents.length === 0) return null;

  return (
    <section
      aria-labelledby="weekend-strip-heading"
      className="rounded-lg border border-border/50 bg-surface-2/60 p-4 backdrop-blur-sm"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" />
          <h2
            id="weekend-strip-heading"
            className="font-display text-lg tracking-wide text-foreground"
          >
            This weekend
          </h2>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
            {weekendEvents.length}
          </span>
        </div>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
        <ul className="flex gap-3 pb-1">
          {weekendEvents.map((event) => {
            const meta = EVENT_TYPE_META[event.event_type];
            const date = parseISO(event.event_date);
            const time = event.start_time ? event.start_time.slice(0, 5) : null;
            return (
              <li key={event.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onEventClick?.(event)}
                  className="group flex h-full w-[16rem] flex-col justify-between rounded-lg border border-border/60 bg-card p-3 text-left transition-all duration-med ease-out-expo hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        meta.cellBg,
                        meta.cellText,
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {format(date, 'EEE d MMM')}
                      {time ? ` · ${time}` : ''}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 font-medium text-foreground">{event.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{event.venue_name}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
