import { ExternalLink, Sparkles, Facebook, Instagram, Globe, Upload, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEventSourceInfo } from '@/lib/eventSource';

interface EventSourceBadgeProps {
  sourceUrl: string | null | undefined;
  /** Compact rendering for cards/lists (just an icon + short label). */
  compact?: boolean;
  className?: string;
}

/**
 * Visible note showing how an event reached the database — particularly
 * highlights when Firecrawl was used to scrape a Facebook/Instagram post,
 * so users know to verify against the original source.
 */
export function EventSourceBadge({ sourceUrl, compact = false, className }: EventSourceBadgeProps) {
  const info = getEventSourceInfo(sourceUrl);
  if (info.kind === 'manual') return null;

  const Icon =
    info.kind === 'facebook'
      ? Facebook
      : info.kind === 'instagram'
        ? Instagram
        : info.kind === 'flyer-upload'
          ? Upload
          : info.kind === 'venue-site'
            ? Globe
            : Pencil;

  const tone = info.viaFirecrawl
    ? 'border-accent/40 bg-accent/10 text-accent'
    : 'border-border bg-muted/30 text-muted-foreground';

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
          tone,
          className,
        )}
        title={info.label}
      >
        <Icon className="h-3 w-3" />
        {info.viaFirecrawl ? 'Firecrawl' : info.kind === 'flyer-upload' ? 'Flyer' : 'Source'}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border p-2 text-xs',
        tone,
        className,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5 font-medium">
          {info.viaFirecrawl && <Sparkles className="h-3 w-3" />}
          <span>{info.label}</span>
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] underline opacity-80 hover:opacity-100"
          >
            View original
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {info.viaFirecrawl && (
          <p className="text-[10px] opacity-70">
            Auto-extracted — please verify details against the original post before booking.
          </p>
        )}
      </div>
    </div>
  );
}
