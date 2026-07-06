import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarHeader({ currentMonth, onPrev, onNext }: CalendarHeaderProps) {
  return (
    <div className="p-4 border-b border-border/50 tactical-gradient">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          aria-label="Previous month"
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
          onClick={onNext}
          aria-label="Next month"
          className="text-foreground hover:bg-primary/20"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
