import { describe, it, expect } from 'vitest';
import {
  isUrlSafe,
  sanitizeUrl,
  normalizeHttpUrl,
  normalizeEventUrls,
  normalizeVenueUrls,
  safeUrlSchema,
} from '../validation';

describe('isUrlSafe', () => {
  it('accepts http and https', () => {
    expect(isUrlSafe('http://a.com')).toBe(true);
    expect(isUrlSafe('https://a.com/x')).toBe(true);
  });
  it('treats empty/nullish as safe (nothing to render)', () => {
    expect(isUrlSafe(null)).toBe(true);
    expect(isUrlSafe(undefined)).toBe(true);
    expect(isUrlSafe('')).toBe(true);
  });
  it('rejects dangerous schemes and malformed input', () => {
    expect(isUrlSafe('javascript:alert(1)')).toBe(false);
    expect(isUrlSafe('data:text/html,x')).toBe(false);
    expect(isUrlSafe('file:///etc/passwd')).toBe(false);
    expect(isUrlSafe('not a url')).toBe(false);
  });
});

describe('sanitizeUrl', () => {
  it('returns url when safe, null otherwise', () => {
    expect(sanitizeUrl('https://a.com')).toBe('https://a.com');
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl('')).toBeNull();
  });
});

describe('normalizeHttpUrl', () => {
  it('returns null for empty/nullish', () => {
    expect(normalizeHttpUrl(null)).toBeNull();
    expect(normalizeHttpUrl(undefined)).toBeNull();
    expect(normalizeHttpUrl('')).toBeNull();
    expect(normalizeHttpUrl('   ')).toBeNull();
  });

  it('prepends https:// to bare domains', () => {
    expect(normalizeHttpUrl('www.foo.com')).toBe('https://www.foo.com');
    expect(normalizeHttpUrl('foo.com/path')).toBe('https://foo.com/path');
    expect(normalizeHttpUrl('foo.co.uk')).toBe('https://foo.co.uk');
  });

  it('upgrades protocol-relative URLs to https', () => {
    expect(normalizeHttpUrl('//cdn.foo.com/a.jpg')).toBe('https://cdn.foo.com/a.jpg');
  });

  it('keeps existing http(s) URLs, stripping trailing root slash', () => {
    expect(normalizeHttpUrl('https://foo.com/')).toBe('https://foo.com');
    expect(normalizeHttpUrl('https://foo.com/path/')).toBe('https://foo.com/path/');
    expect(normalizeHttpUrl('http://foo.com')).toBe('http://foo.com');
  });

  it('trims surrounding whitespace before parsing', () => {
    expect(normalizeHttpUrl('  https://foo.com  ')).toBe('https://foo.com');
  });

  it('rejects dangerous or non-http schemes', () => {
    expect(normalizeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeHttpUrl('data:text/html,x')).toBeNull();
    expect(normalizeHttpUrl('ftp://foo.com')).toBeNull();
    expect(normalizeHttpUrl('mailto:a@b.com')).toBeNull();
  });

  it('rejects garbage that is not a domain', () => {
    expect(normalizeHttpUrl('not a url')).toBeNull();
    expect(normalizeHttpUrl('just-text')).toBeNull();
  });
});

describe('normalizeEventUrls / normalizeVenueUrls', () => {
  it('normalises all url fields on an event without mutating input', () => {
    const input = {
      title: 'x',
      booking_url: 'www.book.com',
      source_url: 'javascript:alert(1)',
      image_url: '//cdn.foo.com/a.jpg',
    };
    const out = normalizeEventUrls(input);
    expect(out.booking_url).toBe('https://www.book.com');
    expect(out.source_url).toBeNull();
    expect(out.image_url).toBe('https://cdn.foo.com/a.jpg');
    expect(input.source_url).toBe('javascript:alert(1)'); // untouched
  });

  it('normalises venue website field', () => {
    expect(normalizeVenueUrls({ id: '1', website: 'foo.com' }).website).toBe('https://foo.com');
    expect(normalizeVenueUrls({ id: '1', website: null }).website).toBeNull();
  });
});

describe('safeUrlSchema (zod)', () => {
  it('accepts safe URLs and empty strings', () => {
    expect(safeUrlSchema.safeParse('https://a.com').success).toBe(true);
    expect(safeUrlSchema.safeParse('').success).toBe(true);
  });
  it('rejects dangerous URLs', () => {
    expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeUrlSchema.safeParse('not a url').success).toBe(false);
  });
});
