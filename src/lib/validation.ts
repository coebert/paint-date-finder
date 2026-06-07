import { z } from 'zod';

/**
 * Safe URL validation that only allows http and https schemes
 * Prevents XSS attacks via javascript: or data: URIs
 */
const SAFE_URL_SCHEMES = ['http:', 'https:'];

export const safeUrlSchema = z.string()
  .refine(
    (url) => {
      if (!url || url.trim() === '') return true; // Allow empty strings
      try {
        const parsed = new URL(url);
        return SAFE_URL_SCHEMES.includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Only http and https URLs are allowed' }
  );

export const safeOptionalUrlSchema = safeUrlSchema.optional().or(z.literal(''));

/**
 * Validates a URL string is safe (http/https only)
 * Returns true if safe, false if dangerous
 */
export function isUrlSafe(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return SAFE_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Returns a safe URL or null if the URL is dangerous
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return isUrlSafe(url) ? url : null;
}

/**
 * Normalise a possibly-schemeless URL into a safe http(s) URL, or null.
 * Used before inserts into columns with a CHECK `url ~ '^https?://'`
 * constraint (e.g. events.booking_url, event_submissions.source_url) so
 * an AI-extracted value like "www.foo.com" doesn't break the insert.
 */
export function normalizeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let candidate = String(url).trim();
  if (!candidate) return null;

  if (/^\/\//.test(candidate)) {
    candidate = `https:${candidate}`;
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    // No scheme — only prepend https:// if it looks like a domain.
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(candidate);
    if (!SAFE_URL_SCHEMES.includes(parsed.protocol)) return null;
    // Canonicalize: strip trailing slash from root path only
    let href = parsed.toString();
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      href = href.replace(/\/$/, '');
    }
    return href;
  } catch {
    return null;
  }
}

/**
 * Normalize all URL fields on an event object for consistent display.
 * Returns a new object so the original is not mutated.
 */
export function normalizeEventUrls<T extends { booking_url: string | null; source_url: string | null; image_url: string | null }>(
  event: T
): T {
  return {
    ...event,
    booking_url: normalizeHttpUrl(event.booking_url),
    source_url: normalizeHttpUrl(event.source_url),
    image_url: normalizeHttpUrl(event.image_url),
  };
}

/**
 * Normalize the website field on a venue object for consistent display.
 * Returns a new object so the original is not mutated.
 */
export function normalizeVenueUrls<T extends { website: string | null }>(venue: T): T {
  return {
    ...venue,
    website: normalizeHttpUrl(venue.website),
  };
}
