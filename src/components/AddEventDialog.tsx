import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminEventSchema, AdminEventFormData, defaultAdminEventValues } from '@/lib/eventSchema';
import { useCreateEvent } from '@/hooks/useEvents';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { EventFormFields } from './EventFormFields';

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
            <EventFormFields
              form={form}
              placeholders={{
                title: 'e.g., Summer Big Game 2024',
                venue_name: 'e.g., Delta Force Paintball',
                description: 'Event details, what to bring, rules, etc...',
              }}
            />

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
