import { useState, useEffect } from 'react';
import { PaintballEvent, EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { useUpdateEvent } from '@/hooks/useEvents';
import { isUrlSafe } from '@/lib/validation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface EventEditDialogProps {
  event: PaintballEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventEditDialog({ event, open, onOpenChange }: EventEditDialogProps) {
  const updateEvent = useUpdateEvent();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'walk_on' as EventType,
    venue_name: '',
    venue_location: '',
    event_date: '',
    start_time: '',
    end_time: '',
    booking_url: '',
    price_info: '',
    is_verified: false,
  });

  useEffect(() => {
    if (event) {
      setFormData({
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
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Validate URL is safe (http/https only)
    if (formData.booking_url && !isUrlSafe(formData.booking_url)) {
      toast.error('Only http and https URLs are allowed for booking URL');
      return;
    }

    await updateEvent.mutateAsync({
      id: event.id,
      updates: {
        ...formData,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        description: formData.description || null,
        venue_location: formData.venue_location || null,
        booking_url: formData.booking_url || null,
        price_info: formData.price_info || null,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            EDIT EVENT
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-input border-border"
                required
              />
            </div>

            <div>
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value as EventType })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event_date">Event Date</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="bg-input border-border"
                required
              />
            </div>

            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="bg-input border-border"
              />
            </div>

            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="bg-input border-border"
              />
            </div>

            <div>
              <Label htmlFor="venue_name">Venue Name</Label>
              <Input
                id="venue_name"
                value={formData.venue_name}
                onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                className="bg-input border-border"
                required
              />
            </div>

            <div>
              <Label htmlFor="venue_location">Location</Label>
              <Input
                id="venue_location"
                value={formData.venue_location}
                onChange={(e) => setFormData({ ...formData, venue_location: e.target.value })}
                className="bg-input border-border"
                placeholder="e.g., Manchester, UK"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="booking_url">Booking URL</Label>
              <Input
                id="booking_url"
                type="url"
                value={formData.booking_url}
                onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                className="bg-input border-border"
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="price_info">Price Info</Label>
              <Input
                id="price_info"
                value={formData.price_info}
                onChange={(e) => setFormData({ ...formData, price_info: e.target.value })}
                className="bg-input border-border"
                placeholder="e.g., £30 per player"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="is_verified"
                checked={formData.is_verified}
                onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked })}
              />
              <Label htmlFor="is_verified">Verified Event</Label>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-input border-border min-h-[100px]"
                placeholder="Event details..."
              />
            </div>
          </div>

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
      </DialogContent>
    </Dialog>
  );
}
