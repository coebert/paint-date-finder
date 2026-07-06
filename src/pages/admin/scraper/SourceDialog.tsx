import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useUpsertTrustedSource, type TrustedSource } from '@/hooks/useScraper';

interface SourceDialogProps {
  trigger: React.ReactNode;
  source?: TrustedSource;
}

/** Add/edit dialog for a scraper trusted source (venue or FB group). */
export function SourceDialog({ trigger, source }: SourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [venueName, setVenueName] = useState(source?.venue_name ?? '');
  const [url, setUrl] = useState(source?.url ?? '');
  const [notes, setNotes] = useState(source?.notes ?? '');
  const [active, setActive] = useState(source?.is_active ?? true);
  const [sourceType, setSourceType] = useState<'venue' | 'facebook_group'>(
    source?.source_type ?? 'venue',
  );
  const upsert = useUpsertTrustedSource();

  const isGroup = sourceType === 'facebook_group';

  const onSave = async () => {
    if (!venueName.trim() || !url.trim()) return;
    await upsert.mutateAsync({
      id: source?.id,
      venue_name: venueName.trim(),
      url: url.trim(),
      notes: notes.trim() || null,
      is_active: active,
      source_type: sourceType,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{source ? 'Edit source' : 'Add trusted source'}</DialogTitle>
          <DialogDescription>
            URLs added here are scraped weekly. Candidates are sent to the Submissions queue for
            review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Source type</Label>
            <Select
              value={sourceType}
              onValueChange={(v) => setSourceType(v as 'venue' | 'facebook_group')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venue">Venue website</SelectItem>
                <SelectItem value="facebook_group">Facebook group (multi-venue)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isGroup
                ? 'Posts in this group may advertise events at many different venues. The AI will extract the venue name from each post.'
                : 'All events on this page belong to a single venue.'}
            </p>
          </div>
          <div className="space-y-1">
            <Label>{isGroup ? 'Group name' : 'Venue name'}</Label>
            <Input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder={isGroup ? 'e.g. UK Paintball Walk-Ons' : 'e.g. Mayhem Paintball'}
            />
          </div>
          <div className="space-y-1">
            <Label>URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                isGroup ? 'https://www.facebook.com/groups/...' : 'https://venue.example/events'
              }
              type="url"
            />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything useful about this page"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} id="active" />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
