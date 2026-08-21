import { format, isToday, isWeekend } from 'date-fns';
import { AlertTriangle, Clock, MapPin, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVENT_TYPE_META, PaintballEvent } from '@/types/events';

interface CalendarWeekViewProps {
  days: Date[];
  eventsByDate: Map<string, PaintballEvent[]>;
  flaggedIds: Set<string> | undefined;
  onEventClick?: (event: PaintballEvent) => void;
}

/**
 * Week view: one column per day with every event listed in full (no "+N more"
 * truncation), so a single week can be scanned end to end.
 */
export function CalendarWeekView({
  days,
  eventsByDate,
  flaggedIds,
  onEventClick,
}: CalendarWeekViewProps) {
  return (
    <div className="grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-7 sm:divide-y-0 sm:divide-x">
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEvents = eventsByDate.get(dateKey) ?? [];
        const isDayToday = isToday(day);

        return (
          <div
            key={dateKey}
            className={cn(
              'min-h-[6rem] p-2 sm:min-h-[16rem]',
              isWeekend(day) && 'bg-secondary/20',
              isDayToday && 'bg-accent/5',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {format(day, 'EEE')}
              </span>
              <span
                className={cn(
                  'text-sm font-medium text-foreground',
                  isDayToday &&
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-accent-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>

            {dayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">—</p>
            ) : (
              <ul className="space-y-1.5">
                {dayEvents.map((event) => {
                  const meta = EVENT_TYPE_META[event.event_type];
                  const time = event.start_time ? event.start_time.slice(0, 5) : null;
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => onEventClick?.(event)}
                        title={`${meta.label} — ${event.title}`}
                        className={cn(
                          'w-full rounded border-l-2 px-1.5 py-1 text-left transition-opacity hover:opacity-80',
                          meta.cellBg,
                          meta.cellText,
                          !event.is_verified && 'opacity-70 border-dashed',
                        )}
                      >
                        <span className="flex items-start gap-1">
                          {flaggedIds?.has(event.id) && (
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                          )}
                          <span className="min-w-0 flex-1 text-xs font-medium line-clamp-2">
                            {event.title}
                          </span>
                          {event.is_verified && (
                            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                          )}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.65rem] opacity-80">
                          {time && (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {time}
                            </span>
                          )}
                          <span className="inline-flex min-w-0 items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{event.venue_name}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
