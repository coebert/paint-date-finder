import { describe, it, expect } from 'vitest';
import { buildSubmissionPayload, isValidEventDate, normalizeTime } from '@/lib/submissionPayload';

const base = {
  title: '  Sunday walk-on  ',
  event_type: 'walk_on',
  venue_name: ' Delta Force ',
  event_date: '2026-12-06',
  submitter_email: ' QA@Example.com ',
};

describe('buildSubmissionPayload', () => {
  it('trims required fields and lower-cases the email', () => {
    const p = buildSubmissionPayload(base);
    expect(p.title).toBe('Sunday walk-on');
    expect(p.venue_name).toBe('Delta Force');
    expect(p.submitter_email).toBe('qa@example.com');
  });

  it('rejects blank required fields', () => {
    expect(() => buildSubmissionPayload({ ...base, title: '   ' })).toThrow(/title/i);
    expect(() => buildSubmissionPayload({ ...base, venue_name: '' })).toThrow(/venue/i);
    expect(() => buildSubmissionPayload({ ...base, submitter_email: 'nope' })).toThrow(/email/i);
  });

  it('rejects unknown event types but accepts mag-fed', () => {
    expect(() => buildSubmissionPayload({ ...base, event_type: 'laser_tag' })).toThrow(/event type/i);
    expect(buildSubmissionPayload({ ...base, event_type: 'mag_fed' }).event_type).toBe('mag_fed');
  });

  it('rejects impossible or malformed dates', () => {
    for (const d of ['2026-02-30', '2026-13-01', 'NaN', '', '06/12/2026', '2026-12-6']) {
      expect(() => buildSubmissionPayload({ ...base, event_date: d })).toThrow(/date/i);
    }
  });

  it('rejects impossible times and normalises single-digit hours', () => {
    expect(() => buildSubmissionPayload({ ...base, start_time: '25:00' })).toThrow(/time/i);
    expect(() => buildSubmissionPayload({ ...base, end_time: 'noon' })).toThrow(/time/i);
    expect(buildSubmissionPayload({ ...base, start_time: '9:30' }).start_time).toBe('09:30');
  });

  it('adds https:// to legitimate schemeless links and refuses unsafe ones', () => {
    expect(buildSubmissionPayload({ ...base, booking_url: 'www.deltaforce.co.uk/book' }).booking_url).toBe(
      'https://www.deltaforce.co.uk/book',
    );
    expect(() => buildSubmissionPayload({ ...base, source_url: 'javascript:alert(1)' })).toThrow(/link/i);
    expect(() => buildSubmissionPayload({ ...base, booking_url: 'call us' })).toThrow(/link/i);
    expect(buildSubmissionPayload({ ...base, booking_url: '  ' }).booking_url).toBeNull();
  });
});

describe('isValidEventDate', () => {
  const today = new Date('2026-11-02T12:00:00Z');
  it('accepts leap days only in leap years', () => {
    expect(isValidEventDate('2028-02-29', today)).toBe(true);
    expect(isValidEventDate('2027-02-29', today)).toBe(false);
  });
  it('rejects years far outside the season window', () => {
    expect(isValidEventDate('1999-06-01', today)).toBe(false);
    expect(isValidEventDate('2035-06-01', today)).toBe(false);
  });
});

describe('normalizeTime', () => {
  it('returns null for blank input', () => {
    expect(normalizeTime('', 'Start time')).toBeNull();
  });
});

describe('submission email and quote limits', () => {
  const base = { title: 'QA', event_type: 'walk_on', venue_name: 'V', event_date: '2026-12-01' };
  it('rejects an overlong email instead of truncating it', () => {
    expect(() => buildSubmissionPayload({ ...base, submitter_email: 'a'.repeat(195) + '@x.com' })).toThrow(/too long/);
  });
  it('keeps the source quote', () => {
    expect(buildSubmissionPayload({ ...base, submitter_email: 'q@x.com', source_quote: ' SUN 8TH NOVEMBER 2026 ' }).source_quote).toBe('SUN 8TH NOVEMBER 2026');
  });
});
