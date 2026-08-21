import { CalendarDays, CalendarRange, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarViewMode = 'month' | 'week' | 'agenda';

const OPTIONS: { value: CalendarViewMode; label: string; icon: typeof CalendarDays }[] = [
  { value: 'month', label: 'Month', icon: CalendarDays },
  { value: 'week', label: 'Week', icon: CalendarRange },
  { value: 'agenda', label: 'Agenda', icon: List },
];

interface CalendarViewToggleProps {
  mode: CalendarViewMode;
  onModeChange: (mode: CalendarViewMode) => void;
  className?: string;
}

export function CalendarViewToggle({ mode, onModeChange, className }: CalendarViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Calendar view"
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 p-1',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onModeChange(value)}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
