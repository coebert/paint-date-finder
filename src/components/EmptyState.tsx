import { CalendarX } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * Shared empty-state slate. Replaces the ad-hoc 🎯 emoji blocks so
 * every "no events" moment shares the same visual weight, spacing
 * and CTA slot.
 */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-surface-1/40 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
        {icon ?? <CalendarX className="h-7 w-7" aria-hidden />}
      </div>
      <h3 className="font-display text-2xl tracking-wide text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
