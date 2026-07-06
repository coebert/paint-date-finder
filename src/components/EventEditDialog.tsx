import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminEventSchema, AdminEventFormData, defaultAdminEventValues } from '@/lib/eventSchema';
import { PaintballEvent } from '@/types/events';
import { useUpdateEvent } from '@/hooks/useEvents';
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

interface EventEditDialogProps {
  event: PaintballEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventEditDialog({ event, open, onOpenChange }: EventEditDialogProps) {
  const updateEvent = useUpdateEvent();

  const form = useForm<AdminEventFormData>({
    resolver: zodResolver(adminEventSchema),
    defaultValues: defaultAdminEventValues,
  });

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        venue_name: event.venue_name,
        venue_location: event.venue_location || '',
        event_date: event.event_date,
        start_time: event.start_time?.slice(0, 5) || '',
        end_time: event.end_time?.slice(0, 5) || '',
        booking_url: event.booking_url || '',
        price_info: event.price_info || '',
        is_verified: event.is_verified,
      });
    }
  }, [event, form]);

  const handleSubmit = async (data: AdminEventFormData) => {
    if (!event) return;

    await updateEvent.mutateAsync({
      id: event.id,
      updates: {
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
        is_verified: data.is_verified,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">EDIT EVENT</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <EventFormFields form={form} />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateEvent.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {updateEvent.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
