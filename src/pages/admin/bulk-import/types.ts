import { parseISO, isValid } from 'date-fns';
import type { EventSubmission } from '@/types/submissions';

export type GroupBy = 'venue' | 'source' | 'event_type';

export interface Issue {
  field: string;
  message: string;
}

export interface EnrichedRow {
  s: EventSubmission;
  issues: Issue[];
}

export interface EditDraft {
  title: string;
  venue_name: string;
  event_date: string;
}

export interface BulkProgress {
  total: number;
  processed: number;
  published: number;
  duplicates: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
}

export function validateSubmission(s: EventSubmission): Issue[] {
  const issues: Issue[] = [];
  if (!s.venue_name || s.venue_name.trim().length < 2 || /^unknown/i.test(s.venue_name.trim())) {
    issues.push({ field: 'venue_name', message: 'Missing or unknown venue' });
  }
  if (!s.event_date || !isValid(parseISO(s.event_date))) {
    issues.push({ field: 'event_date', message: 'Missing or invalid date' });
  } else {
    const d = parseISO(s.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) issues.push({ field: 'event_date', message: 'Event is in the past' });
  }
  if (!s.title || s.title.trim().length < 3) {
    issues.push({ field: 'title', message: 'Title too short' });
  }
  return issues;
}
