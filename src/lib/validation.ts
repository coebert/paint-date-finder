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
