import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarViewToggle, type CalendarViewMode } from './CalendarViewToggle';

interface CalendarHeaderProps {
  title: string;
  mode: CalendarViewMode;
  onModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  showNav?: boolean;
  navLabel?: string;
}

export function CalendarHeader({
  title,
  mode,
  onModeChange,
  onPrev,
  onNext,
  onToday,
  showNav = true,
  navLabel = 'period',
}: CalendarHeaderProps) {
  return (
    <div className="p-4 border-b border-border/50 tactical-gradient space-y-3">
      <div className="flex items-center justify-between gap-2">
        {showNav ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            aria-label={`Previous ${navLabel}`}
            className="text-foreground hover:bg-primary/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <span className="w-10" />
        )}

        <h2 className="font-display text-xl tracking-wider text-foreground text-center sm:text-2xl">
          {title.toUpperCase()}
        </h2>

        {showNav ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            aria-label={`Next ${navLabel}`}
            className="text-foreground hover:bg-primary/20"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <CalendarViewToggle mode={mode} onModeChange={onModeChange} />
        {showNav && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="min-h-9"
          >
            Today
          </Button>
        )}
      </div>
    </div>
  );
}
