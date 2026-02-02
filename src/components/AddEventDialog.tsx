import { useState } from 'react';
import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { useCreateEvent } from '@/hooks/useEvents';
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

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialFormData = {
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
  is_verified: true,
};

export function AddEventDialog({ open, onOpenChange }: AddEventDialogProps) {
  const createEvent = useCreateEvent();
  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL is safe (http/https only)
    if (formData.booking_url && !isUrlSafe(formData.booking_url)) {
      toast.error('Only http and https URLs are allowed for booking URL');
      return;
    }

    await createEvent.mutateAsync({
      title: formData.title,
      description: formData.description || null,
      event_type: formData.event_type,
      venue_name: formData.venue_name,
      venue_location: formData.venue_location || null,
      event_date: formData.event_date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      booking_url: formData.booking_url || null,
      image_url: null,
      price_info: formData.price_info || null,
      is_verified: formData.is_verified,
      source_url: null,
    });

    setFormData(initialFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            ADD NEW EVENT
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="add-title">Event Title *</Label>
              <Input
                id="add-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-input border-border"
                placeholder="e.g., Summer Big Game 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="add-event_type">Event Type *</Label>
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
              <Label htmlFor="add-event_date">Event Date *</Label>
              <Input
                id="add-event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="bg-input border-border"
                required
              />
            </div>

            <div>
              <Label htmlFor="add-start_time">Start Time</Label>
              <Input
                id="add-start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="bg-input border-border"
              />
            </div>

            <div>
              <Label htmlFor="add-end_time">End Time</Label>
              <Input
                id="add-end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="bg-input border-border"
              />
            </div>

            <div>
              <Label htmlFor="add-venue_name">Venue Name *</Label>
              <Input
                id="add-venue_name"
                value={formData.venue_name}
                onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                className="bg-input border-border"
                placeholder="e.g., Delta Force Paintball"
                required
              />
            </div>

            <div>
              <Label htmlFor="add-venue_location">Location</Label>
              <Input
                id="add-venue_location"
                value={formData.venue_location}
                onChange={(e) => setFormData({ ...formData, venue_location: e.target.value })}
                className="bg-input border-border"
                placeholder="e.g., Manchester, UK"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="add-booking_url">Booking URL</Label>
              <Input
                id="add-booking_url"
                type="url"
                value={formData.booking_url}
                onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                className="bg-input border-border"
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="add-price_info">Price Info</Label>
              <Input
                id="add-price_info"
                value={formData.price_info}
                onChange={(e) => setFormData({ ...formData, price_info: e.target.value })}
                className="bg-input border-border"
                placeholder="e.g., £30 per player"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="add-is_verified"
                checked={formData.is_verified}
                onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked })}
              />
              <Label htmlFor="add-is_verified">Verified Event</Label>
            </div>

            <div className="col-span-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-input border-border min-h-[100px]"
                placeholder="Event details, what to bring, rules, etc..."
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
              disabled={createEvent.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
