import { AlertCircle, Inbox, Loader2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/** Coloured status badge used across the sources table and runs list. */
export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">—</Badge>;
  if (status === 'ok' || status === 'success')
    return <Badge className="bg-accent text-accent-foreground">{status}</Badge>;
  if (status === 'partial')
    return <Badge className="bg-secondary text-secondary-foreground">{status}</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
}

/**
 * Extract an HTTP status code from a free-text error message, e.g.
 * "Firecrawl 403: {...}" or "fetch failed: 502 Bad Gateway".
 */
export function extractHttpStatus(msg: string | null): number | null {
  if (!msg) return null;
  const m = msg.match(/\b(?:status\s*[:=]?\s*)?(\d{3})\b/);
  if (!m) return null;
  const code = Number(m[1]);
  return code >= 100 && code <= 599 ? code : null;
}

export function ErrorDetails({ message }: { message: string }) {
  const status = extractHttpStatus(message);
  const onCopy = () => {
    void navigator.clipboard?.writeText(message);
  };
  return (
    <div className="mt-1 w-full max-w-[420px] rounded border border-destructive/30 bg-destructive/5 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Badge variant="destructive" className="text-[10px]">
            error
          </Badge>
          {status ? (
            <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
              HTTP {status}
            </Badge>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-destructive">
        {message}
      </pre>
    </div>
  );
}

export function SourcesSkeleton() {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </li>
        ))}
      </ul>
      <div className="hidden md:block space-y-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-3 border-b border-border/40 last:border-0"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading trusted sources…
      </span>
    </>
  );
}

export function RunsSkeleton() {
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-border/60 bg-card/50 p-3 flex items-center justify-between gap-3"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </li>
        ))}
      </ul>
      <div className="hidden md:block space-y-2" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-3 border-b border-border/40 last:border-0"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading recent runs…
      </span>
    </>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  isRetrying,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Alert
      variant="destructive"
      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="break-words">{message}</AlertDescription>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="self-start sm:self-auto shrink-0"
      >
        {isRetrying ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="mr-2 h-4 w-4" />
        )}
        Retry
      </Button>
    </Alert>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}
