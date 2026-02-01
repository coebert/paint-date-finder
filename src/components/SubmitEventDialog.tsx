import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { safeOptionalUrlSchema } from '@/lib/validation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { useCreateSubmission } from '@/hooks/useSubmissions';
import { Send, CheckCircle } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  event_type: z.enum(['walk_on', 'big_game', 'competition', 'tournament', 'speedball', 'scenario', 'other'] as const),
  venue_name: z.string().min(2, 'Venue name is required').max(200),
  venue_location: z.string().max(200).optional(),
  event_date: z.string().min(1, 'Event date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  booking_url: safeOptionalUrlSchema,
  price_info: z.string().max(100).optional(),
  source_url: safeOptionalUrlSchema,
  submitter_email: z.string().email('Valid email required'),
  submitter_name: z.string().max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmitEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitEventDialog({ open, onOpenChange }: SubmitEventDialogProps) {
  const [submitted, setSubmitted] = useState(false);
  const createSubmission = useCreateSubmission();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      source_url: '',
      submitter_email: '',
      submitter_name: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    await createSubmission.mutateAsync({
      title: data.title,
      description: data.description || null,
      event_type: data.event_type,
      venue_name: data.venue_name,
      venue_location: data.venue_location || null,
      event_date: data.event_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      booking_url: data.booking_url || null,
      price_info: data.price_info || null,
      source_url: data.source_url || null,
      submitter_email: data.submitter_email,
      submitter_name: data.submitter_name || null,
    });
    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      form.reset();
    }, 200);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-display">Thank You!</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your event has been submitted for review. We'll add it to the calendar once verified.
            </DialogDescription>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Submit an Event</DialogTitle>
          <DialogDescription>
            Know about a paintball event? Submit it here and we'll review it for the calendar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Event Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Spring Big Game 2026" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                      <Input type="date" {...field} />
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
                      <Input placeholder="e.g., Delta Force Paintball" {...field} />
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
                      <Input placeholder="e.g., Surrey, UK" {...field} />
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
                      <Input type="time" {...field} />
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
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us about the event..." 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_info"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Info</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., £35 per player" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="booking_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking URL</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="Link to event announcement" {...field} />
                  </FormControl>
                  <FormDescription>
                    Where did you find this event? (Facebook, venue website, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">Your contact info (won't be displayed publicly)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="submitter_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="submitter_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmission.isPending}>
                {createSubmission.isPending ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Event
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
