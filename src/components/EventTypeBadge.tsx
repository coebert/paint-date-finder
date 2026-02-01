import { forwardRef } from 'react';
import { EventType, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '@/types/events';
import { cn } from '@/lib/utils';

interface EventTypeBadgeProps {
  type: EventType;
  className?: string;
}

export const EventTypeBadge = forwardRef<HTMLSpanElement, EventTypeBadgeProps>(
  ({ type, className }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide',
          EVENT_TYPE_COLORS[type],
          className
        )}
      >
        {EVENT_TYPE_LABELS[type]}
      </span>
    );
  }
);

EventTypeBadge.displayName = 'EventTypeBadge';

