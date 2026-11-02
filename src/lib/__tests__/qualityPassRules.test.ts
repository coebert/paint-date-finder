import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { isMatch } from '@/lib/flyerDedupe';
import { sanitizeObstacles } from '@/lib/fieldLayoutValidation';
import { describeFlyerError } from '@/lib/flyerExtraction';

const base = { venue_name: 'Delta Force Bristol', event_date: '2026-12-12', event_type: 'walk_on' as const };

describe('flyer duplicate policy', () => {
  it('does not treat two different games at the same venue/day as duplicates', () => {
    expect(isMatch({ ...base, title: 'Christmas Big Game' } as never, { ...base, title: 'Junior Walk-On' }).match).toBe(false);
  });
  it('flags a similar title at the same venue/day during review', () => {
    expect(isMatch({ ...base, title: 'Sunday Walk-On Day' } as never, { ...base, title: 'Sunday Walk-On' }).match).toBe(true);
  });
  it('at save time only drops the identical event', () => {
    expect(isMatch({ ...base, title: 'Sunday Walk-On Day' } as never, { ...base, title: 'Sunday Walk-On' }, true).match).toBe(false);
    expect(isMatch({ ...base, title: 'Sunday walk-on!' } as never, { ...base, title: 'Sunday Walk-On' }, true).match).toBe(true);
  });
  it('never matches across different dates (wrong-year recurrence)', () => {
    expect(isMatch({ ...base, title: 'Sunday Walk-On', event_date: '2025-12-12' } as never, { ...base, title: 'Sunday Walk-On' }).match).toBe(false);
  });
});

describe('community layout validation', () => {
  it('keeps valid bunkers and drops malformed ones', () => {
    const { obstacles, rejected } = sanitizeObstacles([
      { id: 'a', type: 'snake', x: 50, y: 50, rotation: 90 },
      { id: 'b', type: 'rocket', x: 10, y: 10 },
      { id: 'c', type: 'can', x: 'NaN', y: 10 },
      { id: 'd', type: 'can', x: 150, y: 10 },
      null,
    ]);
    expect(obstacles.map((o) => o.id)).toEqual(['a']);
    expect(rejected).toBe(4);
  });
  it('treats non-list data as empty', () => {
    expect(sanitizeObstacles({ evil: true }).obstacles).toEqual([]);
  });
  it('caps a layout at 500 bunkers', () => {
    const many = Array.from({ length: 600 }, (_, i) => ({ id: String(i), type: 'can', x: 1, y: 1 }));
    expect(sanitizeObstacles(many).obstacles.length).toBe(500);
  });
});

describe('flyer reader errors', () => {
  const err = (status: number, body?: unknown) => ({
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(body ? JSON.stringify(body) : 'x', { status }),
  });
  it('shows the server message (e.g. rate limit) instead of a generic one', async () => {
    const e = await describeFlyerError(err(429, { error: 'Rate limit reached (15 flyer extractions per hour). Please try again later.' }));
    expect(e.status).toBe(429);
    expect(e.message).toContain('15 flyer extractions per hour');
  });
  it('explains sign-in for 401 and credits for 402', async () => {
    expect((await describeFlyerError(err(401))).message).toMatch(/sign in/i);
    expect((await describeFlyerError(err(402))).message).toMatch(/credits/i);
  });
});
