import { useState, useEffect } from 'react';
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
import { useVenues } from '@/hooks/useEvents';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { Send, CheckCircle, Plus, Sparkles, Edit3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlyerImporter } from '@/components/FlyerImporter';
import { dedupeCandidates } from '@/lib/flyerDedupe';
import { toast } from 'sonner';

const ADD_NEW_VENUE = '__add_new__';

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
  source_url: z
    .string()
    .trim()
    .min(1, 'Source link is required so we can verify the event')
    .url('Must be a valid URL')
    .refine((v) => /^https?:\/\//i.test(v), 'URL must start with http:// or https://'),
  submitter_email: z.string().email('Valid email required'),
  submitter_name: z.string().max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmitEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'flyer' | 'manual';
}

export function SubmitEventDialog({ open, onOpenChange, initialTab = 'flyer' }: SubmitEventDialogProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isAddingNewVenue, setIsAddingNewVenue] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState('');
  const createSubmission = useCreateSubmission();
  const { data: eventVenues = [] } = useVenues();
  const { data: venueDetails } = useVenueDetails();

  // Merge venues from events table and venues table for a complete list
  const venues = Array.from(new Set([
    ...eventVenues,
    ...(venueDetails ? Array.from(venueDetails.keys()) : []),
  ])).sort();

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

  // Auto-fill location when selecting an existing venue
  useEffect(() => {
    if (selectedVenue && selectedVenue !== ADD_NEW_VENUE && venueDetails) {
      const venue = venueDetails.get(selectedVenue);
      if (venue?.location) {
        form.setValue('venue_location', venue.location);
      }
    }
  }, [selectedVenue, venueDetails, form]);

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
      image_url: null,
      submitter_email: data.submitter_email,
      submitter_name: data.submitter_name || null,
    });
    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setIsAddingNewVenue(false);
      setSelectedVenue('');
      form.reset();
    }, 200);
  };

  const handleVenueSelect = (value: string) => {
    setSelectedVenue(value);
    if (value === ADD_NEW_VENUE) {
      setIsAddingNewVenue(true);
      form.setValue('venue_name', '');
      form.setValue('venue_location', '');
    } else {
      setIsAddingNewVenue(false);
      form.setValue('venue_name', value);
    }
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

  const handleFlyerSave = async (
    candidates: { title: string; description?: string | null; event_type: EventType; event_date: string; start_time?: string | null; end_time?: string | null; price_info?: string | null; booking_url?: string | null; venue_name?: string | null; venue_location?: string | null }[],
    sourceUrl: string | null,
    flyerImageUrl: string | null,
  ) => {
    const email = (document.getElementById('flyer-submitter-email') as HTMLInputElement | null)?.value?.trim();
    const name = (document.getElementById('flyer-submitter-name') as HTMLInputElement | null)?.value?.trim();
    if (!email || !/.+@.+\..+/.test(email)) {
      toast.error('Please enter a valid email so we can credit the submission');
      return;
    }
    try {
      const { unique, duplicates } = await dedupeCandidates(candidates, 'both');
      if (duplicates.length > 0) {
        toast.warning(
          `Skipped ${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} already on the calendar or awaiting review`,
        );
      }
      if (unique.length === 0) {
        toast.info('All of these events are already on the calendar or queued for review.');
        return;
      }
      for (const c of unique) {
        await createSubmission.mutateAsync({
          title: c.title.slice(0, 200),
          description: c.description?.slice(0, 2000) ?? null,
          event_type: c.event_type,
          venue_name: (c.venue_name || 'Unknown venue').slice(0, 200),
          venue_location: c.venue_location?.slice(0, 200) ?? null,
          event_date: c.event_date,
          start_time: c.start_time || null,
          end_time: c.end_time || null,
          booking_url: c.booking_url || null,
          price_info: c.price_info?.slice(0, 100) ?? null,
          source_url: sourceUrl,
          image_url: flyerImageUrl,
          submitter_email: email,
          submitter_name: name || null,
        });
      }
      setSubmitted(true);
    } catch (e) {
      // useCreateSubmission already toasts on error
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Suggest an Event</DialogTitle>
          <DialogDescription>
            Upload a flyer/screenshot from Facebook and we'll auto-fill the details, or enter them manually.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={initialTab} key={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flyer">
              <Sparkles className="h-4 w-4 mr-2" /> Upload flyer
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Edit3 className="h-4 w-4 mr-2" /> Enter manually
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flyer" className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Your name</label>
                <Input id="flyer-submitter-name" placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Your email *</label>
                <Input id="flyer-submitter-email" type="email" placeholder="you@example.com" required />
              </div>
            </div>
            <FlyerImporter
              onSave={handleFlyerSave}
              saveLabel="Submit for review"
              saving={createSubmission.isPending}
            />
          </TabsContent>

          <TabsContent value="manual" className="pt-4">
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
                    <FormLabel>Venue *</FormLabel>
                    {!isAddingNewVenue ? (
                      <Select onValueChange={handleVenueSelect} value={selectedVenue}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a venue" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {venues.map((venue) => (
                            <SelectItem key={venue} value={venue}>
                              {venue}
                            </SelectItem>
                          ))}
                          <SelectItem value={ADD_NEW_VENUE} className="text-accent">
                            <span className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add new venue
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2">
                        <FormControl>
                          <Input placeholder="Enter venue name" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsAddingNewVenue(false);
                            setSelectedVenue('');
                            form.setValue('venue_name', '');
                            form.setValue('venue_location', '');
                          }}
                          className="text-xs text-muted-foreground"
                        >
                          ← Back to venue list
                        </Button>
                      </div>
                    )}
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
                  <FormLabel>Source Link *</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://facebook.com/... or venue site" {...field} />
                  </FormControl>
                  <FormDescription>
                    Required — link to the Facebook post, venue page, or announcement so we can verify it.
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

