import { Crosshair, Calendar, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  view: 'calendar' | 'list';
  onViewChange: (view: 'calendar' | 'list') => void;
  onAddEvent: () => void;
}

export function Header({ view, onViewChange, onAddEvent }: HeaderProps) {
  return (
    <header className="tactical-gradient border-b border-border/50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center accent-glow">
              <Crosshair className="w-7 h-7 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
                UK PAINTBALL EVENTS
              </h1>
              <p className="text-sm text-muted-foreground">
                Find and book paintball events across the United Kingdom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-secondary rounded-lg p-1 flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('calendar')}
                className={cn(
                  'gap-2 transition-colors',
                  view === 'calendar'
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('list')}
                className={cn(
                  'gap-2 transition-colors',
                  view === 'list'
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-4 w-4" />
                List
              </Button>
            </div>

            <Button
              onClick={onAddEvent}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
