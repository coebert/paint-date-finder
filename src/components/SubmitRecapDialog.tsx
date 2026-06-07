import { useState } from 'react';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateRecap } from '@/hooks/useEventRecaps';
import { safeUrlSchema } from '@/lib/validation';
import { toast } from 'sonner';

const schema = z.object({
  uploader_name: z.string().trim().min(1, 'Required').max(80),
  uploader_email: z.string().trim().email('Invalid email').max(200),
  media_url: safeUrlSchema.refine((v) => !!v && v.length > 0, { message: 'Required' }),
  media_type: z.enum(['image', 'video']),
  caption: z.string().trim().max(300).optional(),
});

interface Props {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function SubmitRecapDialog({ eventId, eventTitle, open, onOpenChange }: Props) {
  const [form, setForm] = useState({
    uploader_name: '',
    uploader_email: '',
    media_url: '',
    media_type: 'image' as 'image' | 'video',
    caption: '',
  });
  const create = useCreateRecap();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    await create.mutateAsync({
      event_id: eventId,
      uploader_name: parsed.data.uploader_name,
      uploader_email: parsed.data.uploader_email,
      media_url: parsed.data.media_url,
      media_type: parsed.data.media_type,
      caption: parsed.data.caption,
    });
    setForm({ uploader_name: '', uploader_email: '', media_url: '', media_type: 'image', caption: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share a recap</DialogTitle>
          <DialogDescription>
            Add a photo or short video from {eventTitle}. Paste a public link from Imgur, Google
            Photos, YouTube, Vimeo, or any direct image URL. Submissions are moderated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="r-name">Your name</Label>
            <Input id="r-name" value={form.uploader_name}
              onChange={(e) => setForm({ ...form, uploader_name: e.target.value })}
              maxLength={80} required />
          </div>
          <div>
            <Label htmlFor="r-email">Email (not published)</Label>
            <Input id="r-email" type="email" value={form.uploader_email}
              onChange={(e) => setForm({ ...form, uploader_email: e.target.value })}
              maxLength={200} required />
          </div>
          <div>
            <Label>Media type</Label>
            <RadioGroup
              value={form.media_type}
              onValueChange={(v) => setForm({ ...form, media_type: v as 'image' | 'video' })}
              className="flex gap-4 mt-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="image" id="mt-image" />
                <Label htmlFor="mt-image" className="cursor-pointer">Photo</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="video" id="mt-video" />
                <Label htmlFor="mt-video" className="cursor-pointer">Video</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="r-url">Public URL</Label>
            <Input id="r-url" type="url" placeholder="https://..." value={form.media_url}
              onChange={(e) => setForm({ ...form, media_url: e.target.value })}
              maxLength={1000} required />
          </div>
          <div>
            <Label htmlFor="r-caption">Caption (optional)</Label>
            <Textarea id="r-caption" value={form.caption} rows={2}
              onChange={(e) => setForm({ ...form, caption: e.target.value })} maxLength={300} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Submitting…' : 'Submit recap'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
