import { format, isSameMonth, isToday } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVENT_TYPE_META, PaintballEvent } from '@/types/events';

interface CalendarDayCellProps {
  day: Date;
  currentMonth: Date;
  dayEvents: PaintballEvent[];
  isExpanded: boolean;
  flaggedIds: Set<string> | undefined;
  onDateClick: (dateKey: string, hasEvents: boolean) => void;
  onEventClick?: (event: PaintballEvent) => void;
}

export function CalendarDayCell({
  day,
  currentMonth,
  dayEvents,
  isExpanded,
  flaggedIds,
  onDateClick,
  onEventClick,
}: CalendarDayCellProps) {
  const dateKey = format(day, 'yyyy-MM-dd');
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isDayToday = isToday(day);
  const hasEvents = dayEvents.length > 0;

  return (
    <div
      onClick={() => onDateClick(dateKey, hasEvents)}
      className={cn(
        'calendar-day relative',
        !isCurrentMonth && 'opacity-40',
        hasEvents && 'has-events cursor-pointer',
        isDayToday && 'today',
        isExpanded && 'ring-2 ring-accent ring-inset bg-accent/10 z-10',
      )}
    >
      <span className={cn('text-sm font-medium', isDayToday && 'text-accent')}>
        {format(day, 'd')}
      </span>

      <div className="mt-1 space-y-1">
        {dayEvents.slice(0, 2).map((event) => {
          const meta = EVENT_TYPE_META[event.event_type];
          return (
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
                  meta.cellBg,
                  meta.cellText,
                  !event.is_verified && 'opacity-60 border border-dashed border-current',
                )}
              >
                {flaggedIds?.has(event.id) && (
                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                )}
                <span className="truncate">{event.title}</span>
              </div>
            </button>
          );
        })}
        {dayEvents.length > 2 && !isExpanded && (
          <div className="text-xs text-accent font-medium hover:underline">
            +{dayEvents.length - 2} more
          </div>
        )}
      </div>
    </div>
  );
}
