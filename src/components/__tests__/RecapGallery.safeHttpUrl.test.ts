import { describe, it, expect } from 'vitest';
import { safeHttpUrl } from '../RecapGallery';

describe('safeHttpUrl (recap media_url guard)', () => {
  it('accepts http and https URLs', () => {
    expect(safeHttpUrl('https://cdn.example.com/photo.jpg')).toBe(
      'https://cdn.example.com/photo.jpg',
    );
    expect(safeHttpUrl('http://example.com/v.mp4')).toBe(
      'http://example.com/v.mp4',
    );
  });

  it('rejects javascript: / data: / file: / vbscript: schemes', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHttpUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(safeHttpUrl('file:///etc/passwd')).toBeNull();
    expect(safeHttpUrl('vbscript:msgbox(1)')).toBeNull();
    expect(safeHttpUrl('ftp://example.com/x')).toBeNull();
  });

  it('rejects empty / null / undefined / malformed values', () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl('')).toBeNull();
    expect(safeHttpUrl('not a url')).toBeNull();
    expect(safeHttpUrl('   ')).toBeNull();
  });

  it('handles whitespace/control-char prefix bypass attempts', () => {
    // Browsers historically tolerated leading control chars; URL() does too,
    // but the scheme is what matters — these must still be classified.
    expect(safeHttpUrl('\tjavascript:alert(1)')).toBeNull();
    expect(safeHttpUrl(' javascript:alert(1)')).toBeNull();
  });
});
