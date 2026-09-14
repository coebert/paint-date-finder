import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const replySchema = z.object({
  sender_name: z.string().trim().min(1, 'Your name is required').max(80),
  sender_email: z.string().trim().email('Enter a valid email').max(200),
  message: z.string().trim().min(10, 'Add a little more detail').max(1500),
});

interface ReplyToPlayerDialogProps {
  postId: string | null;
  playerName: string;
  onClose: () => void;
}

/** Sends a reply to a "Looking for a game" post without revealing the player's email. */
export function ReplyToPlayerDialog({ postId, playerName, onClose }: ReplyToPlayerDialogProps) {
  const [form, setForm] = useState({ sender_name: '', sender_email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId) return;
    const parsed = replySchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('relay-player-reply', {
        body: { post_id: postId, ...parsed.data },
      });
      if (error) throw error;
      if ((data as { relayed_to_moderator?: boolean })?.relayed_to_moderator) {
        toast.success(`Sent to a moderator, who'll pass it on to ${playerName}.`);
      } else {
        toast.success(`Your reply is on its way to ${playerName}.`);
      }
      setForm({ sender_name: '', sender_email: '', message: '' });
      onClose();
    } catch {
      toast.error("We couldn't send that reply. Please try again later.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!postId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reply to {playerName}</DialogTitle>
          <DialogDescription>
            We'll email your message straight to them. Their address stays private, and they'll see
            yours so they can reply.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="reply-name">Your name or team</Label>
            <Input id="reply-name" value={form.sender_name} maxLength={80} required
              onChange={(e) => setForm({ ...form, sender_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="reply-email">Your email</Label>
            <Input id="reply-email" type="email" value={form.sender_email} maxLength={200} required
              onChange={(e) => setForm({ ...form, sender_email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="reply-message">Message</Label>
            <Textarea id="reply-message" rows={5} maxLength={1500} required
              placeholder="Tell them which game you can offer them a slot at, and how to book."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <Button type="submit" className="w-full min-h-11" disabled={sending}>
            {sending ? 'Sending…' : 'Send reply'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
