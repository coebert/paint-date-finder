import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { EVENT_TYPE_META, EventType } from '@/types/events';

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-t border-border/50 bg-secondary/20 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="border border-border/50 rounded px-1.5 py-0.5">Verified</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="border border-dashed border-muted-foreground/30 rounded px-1.5 py-0.5 opacity-60">
          Unverified
        </span>
      </div>
      <span className="hidden sm:inline text-border">|</span>
      {(Object.entries(EVENT_TYPE_META) as [EventType, (typeof EVENT_TYPE_META)[EventType]][]).map(
        ([type, meta]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${meta.swatch}`} />
            <span>{meta.label}</span>
          </div>
        ),
      )}
    </div>
  );
}
