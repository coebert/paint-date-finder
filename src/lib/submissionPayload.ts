import { Constants } from '@/integrations/supabase/types';
import type { EventType } from '@/types/events';
import type { EventSubmissionInsert } from '@/types/submissions';
import { normalizeHttpUrl } from '@/lib/validation';

/**
 * Validates and normalises a public event submission before it is sent to
 * the database. Throws SubmissionValidationError with a user-readable message
 * so bad data (impossible dates, unknown event types, unsafe links, blank
 * required fields) never reaches the moderation queue.
 */
export class SubmissionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubmissionValidationError';
  }
}

export interface RawSubmission {
  title?: string | null;
  description?: string | null;
  event_type?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  booking_url?: string | null;
  price_info?: string | null;
  source_url?: string | null;
  image_url?: string | null;
  submitter_email?: string | null;
  submitter_name?: string | null;
}

const EVENT_TYPES = Constants.public.Enums.event_type as readonly string[];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: string | null | undefined, max: number): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t.slice(0, max) : null;
}

/** True only for a real calendar date in YYYY-MM-DD form within a sane range. */
export function isValidEventDate(value: string | null | undefined, today = new Date()): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return false;
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  const thisYear = today.getUTCFullYear();
  return y >= thisYear - 1 && y <= thisYear + 3;
}

/** Normalises "9:00", "09:00" or "09:00:00" to HH:MM(:SS); null if blank; throws if impossible. */
export function normalizeTime(value: string | null | undefined, label: string): string | null {
  const t = value?.trim();
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) throw new SubmissionValidationError(`${label} must be a time like 09:00`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = m[3] ? Number(m[3]) : 0;
  if (h > 23 || min > 59 || s > 59) throw new SubmissionValidationError(`${label} is not a real time`);
  return `${String(h).padStart(2, '0')}:${m[2]}${m[3] ? `:${m[3]}` : ''}`;
}

function optionalUrl(value: string | null | undefined, label: string): string | null {
  if (value == null || !String(value).trim()) return null;
  const url = normalizeHttpUrl(value);
  if (!url) throw new SubmissionValidationError(`${label} must be a web link starting with http:// or https://`);
  return url.slice(0, 2000);
}

export function buildSubmissionPayload(raw: RawSubmission): EventSubmissionInsert {
  const title = clean(raw.title, 200);
  if (!title) throw new SubmissionValidationError('Event title is required');
  const venue_name = clean(raw.venue_name, 200);
  if (!venue_name) throw new SubmissionValidationError('Venue name is required');
  const submitter_email = clean(raw.submitter_email, 200)?.toLowerCase() ?? null;
  if (!submitter_email || !EMAIL_RE.test(submitter_email)) {
    throw new SubmissionValidationError('A valid email address is required');
  }
  const event_type = raw.event_type?.trim() ?? '';
  if (!EVENT_TYPES.includes(event_type)) throw new SubmissionValidationError('Please choose a valid event type');
  const event_date = raw.event_date?.trim() ?? '';
  if (!isValidEventDate(event_date)) throw new SubmissionValidationError(`"${title}" needs a real event date`);

  return {
    title,
    description: clean(raw.description, 2000),
    event_type: event_type as EventType,
    venue_name,
    venue_location: clean(raw.venue_location, 200),
    event_date,
    start_time: normalizeTime(raw.start_time, 'Start time'),
    end_time: normalizeTime(raw.end_time, 'End time'),
    booking_url: optionalUrl(raw.booking_url, 'Booking link'),
    price_info: clean(raw.price_info, 100),
    source_url: optionalUrl(raw.source_url, 'Source link'),
    image_url: optionalUrl(raw.image_url, 'Flyer image link'),
    submitter_email,
    submitter_name: clean(raw.submitter_name, 100),
  };
}
