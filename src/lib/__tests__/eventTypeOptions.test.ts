import { describe, it, expect } from 'vitest';
import { EVENT_TYPE_LABELS } from '@/types/events';
import { Constants } from '@/integrations/supabase/types';
import { buildSubmissionPayload } from '@/lib/submissionPayload';

describe('event type dropdown matches shared validation', () => {
  it('offers exactly the database event types', () => {
    expect(Object.keys(EVENT_TYPE_LABELS).sort()).toEqual([...Constants.public.Enums.event_type].sort());
  });

  it('accepts mag_fed through the submission gate', () => {
    const r = buildSubmissionPayload({
      title: 'Mag day', event_type: 'mag_fed', venue_name: 'Delta', event_date: '2026-12-12',
      submitter_email: 'a@b.co',
    } as never);
    expect(r.ok).toBe(true);
  });
});
