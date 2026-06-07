import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

const PROMINENT_TYPES: EventType[] = ['walk_on', 'mag_fed', 'speedball', 'scenario'];

interface EventTypeChipsProps {
  eventType: EventType | undefined;
  beginnerOnly: boolean;
  onEventTypeChange: (t: EventType | undefined) => void;
  onBeginnerOnlyChange: (v: boolean) => void;
}

export function EventTypeChips({
  eventType,
  beginnerOnly,
  onEventTypeChange,
  onBeginnerOnlyChange,
}: EventTypeChipsProps) {
  const allActive = !eventType && !beginnerOnly;

  const chipClass = (active: boolean) =>
    cn(
      'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
      active
        ? 'bg-accent text-accent-foreground border-accent shadow-sm'
        : 'bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/60',
    );

  return (
    <div
      role="tablist"
      aria-label="Quick event type filters"
      className="-mx-4 px-4 overflow-x-auto scrollbar-none"
    >
      <div className="flex items-center gap-2 pb-1">
        <button
          type="button"
          role="tab"
          aria-selected={allActive}
          onClick={() => {
            onEventTypeChange(undefined);
            onBeginnerOnlyChange(false);
          }}
          className={chipClass(allActive)}
        >
          All events
        </button>
        {PROMINENT_TYPES.map((t) => {
          const active = eventType === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onEventTypeChange(active ? undefined : t)}
              className={chipClass(active)}
            >
              {EVENT_TYPE_LABELS[t]}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={beginnerOnly}
          onClick={() => onBeginnerOnlyChange(!beginnerOnly)}
          className={chipClass(beginnerOnly)}
        >
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Beginner-friendly
          </span>
        </button>
      </div>
    </div>
  );
}
