import { describe, it, expect } from 'vitest';
import { evidenceLabel } from '@/lib/evidenceLabel';

describe('listing labels stay truthful', () => {
  it('only "Source confirmed" when the organiser page confirmed the date', () => {
    expect(evidenceLabel({ is_verified: true, verification_status: 'source_confirmed', last_verified_at: null }).short).toBe('Source confirmed');
  });
  it('moderator-approved without source check is labelled moderator reviewed', () => {
    expect(evidenceLabel({ is_verified: true, verification_status: 'needs_evidence', last_verified_at: null }).short).toBe('Moderator reviewed');
  });
  it('failed re-check is not shown as confirmed', () => {
    expect(evidenceLabel({ is_verified: true, verification_status: 'contradicted', last_verified_at: null }).tone).toBe('warning');
  });
});
