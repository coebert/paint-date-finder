import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminEventSchema, AdminEventFormData, defaultAdminEventValues } from '@/lib/eventSchema';
import { EVENT_TYPE_LABELS, EventType } from '@/types/events';
import { useCreateEvent } from '@/hooks/useEvents';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEventDialog({ open, onOpenChange }: AddEventDialogProps) {
  const createEvent = useCreateEvent();

  const form = useForm<AdminEventFormData>({
    resolver: zodResolver(adminEventSchema),
    defaultValues: defaultAdminEventValues,
  });

  const handleSubmit = async (data: AdminEventFormData) => {
    await createEvent.mutateAsync({
      title: data.title,
      description: data.description || null,
      event_type: data.event_type,
      venue_name: data.venue_name,
      venue_location: data.venue_location || null,
      event_date: data.event_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      booking_url: data.booking_url || null,
      image_url: null,
      price_info: data.price_info || null,
      is_verified: data.is_verified,
      source_url: null,
    });

    form.reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            ADD NEW EVENT
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                        placeholder="e.g., Summer Big Game 2024"
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
                      <Input
                        {...field}
                        type="date"
                        className="bg-input border-border"
                      />
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
                      <Input
                        {...field}
                        type="time"
                        className="bg-input border-border"
                      />
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
                      <Input
                        {...field}
                        type="time"
                        className="bg-input border-border"
                      />
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
                        placeholder="e.g., Delta Force Paintball"
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
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
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
                        placeholder="Event details, what to bring, rules, etc..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEvent.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {createEvent.isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
