import { EventType } from './events';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface EventSubmission {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  venue_name: string;
  venue_location: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  booking_url: string | null;
  price_info: string | null;
  source_url: string | null;
  submitter_email: string;
  submitter_name: string | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};
