import { useMemo } from 'react';
import { format, parseISO, isToday, isTomorrow, isBefore, startOfDay } from 'date-fns';
import { AlertTriangle, Clock, MapPin, ShieldCheck } from 'lucide-react';
import { EVENT_TYPE_META, PaintballEvent } from '@/types/events';
import { useFlaggedEventIds } from '@/hooks/useEventFlags';
import { cn } from '@/lib/utils';

interface EventAgendaProps {
  events: PaintballEvent[];
  onEventClick?: (event: PaintballEvent) => void;
}

/**
 * Mobile-first agenda view: a chronological list of upcoming events
 * grouped by day. Replaces the desktop month grid on small viewports
 * where a 7-column calendar is unreadable.
 */
export function EventAgenda({ events, onEventClick }: EventAgendaProps) {
  const { data: flaggedIds } = useFlaggedEventIds();

  const grouped = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming = events
      .filter((e) => !isBefore(parseISO(e.event_date), today))
      .sort(
        (a, b) =>
          a.event_date.localeCompare(b.event_date) ||
          (a.start_time || '').localeCompare(b.start_time || ''),
      );
    const map = new Map<string, PaintballEvent[]>();
    for (const e of upcoming) {
      const list = map.get(e.event_date);
      if (list) list.push(e);
      else map.set(e.event_date, [e]);
    }
    return Array.from(map.entries());
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">
          No upcoming events match your filters.
        </p>
      </div>
    );
  }

  const dayLabel = (iso: string) => {
    const d = parseISO(iso);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEE d MMM');
  };

  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, dayEvents]) => (
        <section
          key={dateKey}
          className="rounded-lg border border-border/50 bg-card overflow-hidden"
        >
          <header className="flex items-baseline justify-between border-b border-border/50 bg-secondary/30 px-4 py-2">
            <h3 className="font-display text-base tracking-wide text-foreground">
              {dayLabel(dateKey)}
            </h3>
            <span className="text-xs text-muted-foreground">
              {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'}
            </span>
          </header>
          <ul className="divide-y divide-border/40">
            {dayEvents.map((event) => {
              const meta = EVENT_TYPE_META[event.event_type];
              const time = event.start_time ? event.start_time.slice(0, 5) : null;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onEventClick?.(event)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40 active:bg-secondary/60"
                  >
                    <span
                      aria-hidden
                      className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', meta.swatch)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 font-medium text-foreground line-clamp-2">
                          {event.title}
                        </p>
                        {event.is_verified ? (
                          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                        {flaggedIds?.has(event.id) && (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[16rem]">{event.venue_name}</span>
                        </span>
                        {time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </span>
                        )}
                        <span className="text-accent">{meta.label}</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
