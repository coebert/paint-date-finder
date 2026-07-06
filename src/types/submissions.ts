import type { Database } from '@/integrations/supabase/types';
import { EventType } from './events';

/**
 * Derived directly from generated types so `source_quote` and any other
 * columns can never silently drop out of TypeScript coverage.
 */
export type EventSubmission = Database['public']['Tables']['event_submissions']['Row'];
export type EventSubmissionInsert = Database['public']['Tables']['event_submissions']['Insert'];

export type SubmissionStatus = NonNullable<EventSubmission['status']> extends string
  ? EventSubmission['status']
  : 'pending' | 'approved' | 'rejected';

export const SUBMISSION_STATUS_LABELS: Record<'pending' | 'approved' | 'rejected', string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

// Re-export so callers keep a single import path.
export type { EventType };
