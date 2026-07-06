import { UseFormReturn } from 'react-hook-form';
import { AdminEventFormData } from '@/lib/eventSchema';
import { EVENT_TYPE_LABELS, EventType } from '@/types/events';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface EventFormFieldsProps {
  form: UseFormReturn<AdminEventFormData>;
  /** Extra placeholders — only shown when supplied. */
  placeholders?: {
    title?: string;
    venue_name?: string;
    description?: string;
  };
}

/**
 * Shared form body for the admin "add event" and "edit event" dialogs.
 * Owns nothing on its own — receives the parent's react-hook-form instance
 * and renders the fields defined by `adminEventSchema`.
 */
export function EventFormFields({ form, placeholders = {} }: EventFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Event Title *</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="bg-input border-border"
                placeholder={placeholders.title}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="event_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Type *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {EVENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="event_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Date *</FormLabel>
            <FormControl>
              <Input {...field} type="date" className="bg-input border-border" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="start_time"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start Time</FormLabel>
            <FormControl>
              <Input {...field} type="time" className="bg-input border-border" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="end_time"
        render={({ field }) => (
          <FormItem>
            <FormLabel>End Time</FormLabel>
            <FormControl>
              <Input {...field} type="time" className="bg-input border-border" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="venue_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Venue Name *</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="bg-input border-border"
                placeholder={placeholders.venue_name}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="venue_location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="bg-input border-border"
                placeholder="e.g., Manchester, UK"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="booking_url"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Booking URL</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="url"
                className="bg-input border-border"
                placeholder="https://..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="price_info"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Price Info</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="bg-input border-border"
                placeholder="e.g., £30 per player"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="is_verified"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3 pt-6">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">Verified Event</FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="bg-input border-border min-h-[100px]"
                placeholder={placeholders.description}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Re-export Form so consumers only import from one place if they want.
export { Form };
