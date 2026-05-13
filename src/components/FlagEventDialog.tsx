import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Flag, AlertTriangle, Loader2, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { storeFlagToken } from '@/hooks/useEventFlags';

const FLAG_REASONS = [
  { value: 'wrong_date', label: 'Date is incorrect', description: 'The event exists but the date shown is wrong' },
  { value: 'cancelled', label: 'Event has been cancelled', description: 'This event is no longer taking place' },
  { value: 'does_not_exist', label: 'Event does not exist', description: 'This event is fictional or was never scheduled' },
  { value: 'wrong_venue', label: 'Venue is incorrect', description: 'The event exists but at a different venue' },
  { value: 'other', label: 'Other issue', description: 'Something else is wrong with this listing' },
] as const;

interface FlagEventDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlagEventDialog({ eventId, eventTitle, open, onOpenChange }: FlagEventDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [suggestedDate, setSuggestedDate] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    if (reason === 'wrong_date' && !suggestedDate) {
      toast.error('Please pick the correct date so admins can apply your suggestion.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_event_flag' as any, {
        _event_id: eventId,
        _reason: reason,
        _details: details.trim() || null,
        _suggested_date:
          reason === 'wrong_date' && suggestedDate
            ? format(suggestedDate, 'yyyy-MM-dd')
            : null,
      });

      if (error) throw error;

      // Store the delete token so the user can withdraw their flag
      const row = Array.isArray(data) ? (data as any)[0] : (data as any);
      if (row?.id && row?.delete_token) {
        storeFlagToken(eventId, row.id, row.delete_token);
      }

      toast.success('Thank you! Your report has been submitted for review.');
      queryClient.invalidateQueries({ queryKey: ['flagged-event-ids'] });
      setReason('');
      setDetails('');
      setSuggestedDate(undefined);
      onOpenChange(false);
    } catch (err) {
      console.error('Error submitting flag:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Flag "<span className="font-medium text-foreground">{eventTitle}</span>" as potentially incorrect. Our team will review your report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">
              What's wrong with this event?
            </Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {FLAG_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    reason === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <RadioGroupItem value={r.value} className="mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="flag-details" className="text-sm font-medium text-foreground mb-2 block">
              Additional details <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="flag-details"
              placeholder="E.g. 'The correct date is March 25th' or 'This venue closed down last month'"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              className="resize-none bg-background"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{details.length}/500</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleSubmit}
              disabled={isSubmitting || !reason}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Flag className="h-4 w-4 mr-2" />
              )}
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
