import type { PaintballEvent } from '@/types/events';

export type EvidenceTone = 'confirmed' | 'reviewed' | 'warning';

/**
 * Truthful listing label. "Source confirmed" only when the organiser's page was
 * read and its excerpt states this exact date; otherwise say what really happened.
 */
export function evidenceLabel(
  e: Pick<PaintballEvent, 'is_verified' | 'verification_status' | 'last_verified_at'>,
): { tone: EvidenceTone; short: string; long: string } {
  const s = e.verification_status;
  if (s === 'source_confirmed') {
    const when = e.last_verified_at ? new Date(e.last_verified_at) : null;
    const d = when ? `${String(when.getDate()).padStart(2, '0')}/${String(when.getMonth() + 1).padStart(2, '0')}/${when.getFullYear()}` : null;
    return { tone: 'confirmed', short: 'Source confirmed', long: `Organiser's page shows this date${d ? ` (checked ${d})` : ''}` };
  }
  if (s === 'stale' || s === 'contradicted' || s === 'unavailable' || s === 'missing') {
    return { tone: 'warning', short: 'Being re-checked', long: "We couldn't re-confirm this on the organiser's page — check with the venue before travelling" };
  }
  if (e.is_verified) {
    return { tone: 'reviewed', short: 'Moderator reviewed', long: "Checked by a moderator — confirm with the venue before travelling" };
  }
  return { tone: 'warning', short: 'Unconfirmed', long: 'Not yet confirmed — check with the venue before travelling' };
}
