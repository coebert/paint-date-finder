import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Hidden-for-review events must be excluded by every public reader, not only by RLS
// (admins browsing the public site would otherwise still see them).
const files = [
  'src/hooks/useEvents.ts', 'src/hooks/useCppsRounds.ts',
  'supabase/functions/event-og-image/index.ts', 'supabase/functions/send-event-alerts/index.ts',
  'scripts/generate-sitemap.ts',
];
describe('quarantined events stay out of public surfaces', () => {
  for (const f of files) {
    it(f, () => expect(readFileSync(f, 'utf8')).toMatch(/quarantined/));
  }
});
