import { z } from 'zod';
import { safeOptionalUrlSchema } from '@/lib/validation';

/**
 * Zod schema for admin event creation/editing forms
 * Provides comprehensive validation with length limits matching database constraints
 */
export const adminEventSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Event title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  event_type: z.enum(['walk_on', 'big_game', 'competition', 'tournament', 'speedball', 'scenario', 'mag_fed', 'other'] as const),
  venue_name: z.string()
    .trim()
    .min(1, 'Venue name is required')
    .max(200, 'Venue name must be less than 200 characters'),
  venue_location: z.string()
    .trim()
    .max(200, 'Location must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  event_date: z.string().min(1, 'Event date is required'),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  booking_url: safeOptionalUrlSchema,
  price_info: z.string()
    .trim()
    .max(100, 'Price info must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  is_verified: z.boolean().default(true),
});

export type AdminEventFormData = z.infer<typeof adminEventSchema>;

export const defaultAdminEventValues: AdminEventFormData = {
  title: '',
  description: '',
  event_type: 'walk_on',
  venue_name: '',
  venue_location: '',
  event_date: '',
  start_time: '',
  end_time: '',
  booking_url: '',
  price_info: '',
  is_verified: true,
};
