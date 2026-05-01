/**
 * Inspect an event's `source_url` and figure out *how* the event most likely
 * landed in our database. This is purely heuristic — we don't persist the
 * extraction pipeline metadata on the event itself, so we infer from the host.
 *
 * Used to render a small "source" note on event cards / detail dialogs so
 * users know whether an event was hand-entered, scraped via Firecrawl from
 * a social post, or pulled from a venue's own website.
 */
export type EventSourceKind =
  | 'facebook'
  | 'instagram'
  | 'flyer-upload'
  | 'venue-site'
  | 'other'
  | 'manual';

export interface EventSourceInfo {
  kind: EventSourceKind;
  /** Short human label, e.g. "Facebook post (via Firecrawl)". */
  label: string;
  /** Whether Firecrawl was (almost certainly) used to scrape the source. */
  viaFirecrawl: boolean;
  /** Hostname for display, when available. */
  host?: string;
}

const FACEBOOK_HOSTS = ['facebook.com', 'm.facebook.com', 'fb.com', 'fb.watch'];
const INSTAGRAM_HOSTS = ['instagram.com', 'instagr.am'];

export function getEventSourceInfo(sourceUrl: string | null | undefined): EventSourceInfo {
  if (!sourceUrl) {
    return { kind: 'manual', label: 'Manually added', viaFirecrawl: false };
  }

  let host: string | undefined;
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return { kind: 'other', label: 'External source', viaFirecrawl: false };
  }

  if (FACEBOOK_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
    return {
      kind: 'facebook',
      label: 'Scraped from Facebook via Firecrawl',
      viaFirecrawl: true,
      host,
    };
  }

  if (INSTAGRAM_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
    return {
      kind: 'instagram',
      label: 'Scraped from Instagram via Firecrawl',
      viaFirecrawl: true,
      host,
    };
  }

  // Direct flyer upload — image hosted in our public bucket.
  if (host.includes('supabase.co') && sourceUrl.includes('/flyer-images/')) {
    return {
      kind: 'flyer-upload',
      label: 'Imported from uploaded flyer',
      viaFirecrawl: false,
      host,
    };
  }

  return {
    kind: 'venue-site',
    label: `Scraped from ${host} via Firecrawl`,
    viaFirecrawl: true,
    host,
  };
}
