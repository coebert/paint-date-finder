import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Mail, MapPin, Plus, UserSearch, Copy } from 'lucide-react';
import { z } from 'zod';
import { RouteHead } from '@/components/RouteHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SITE_ORIGIN = 'https://findawalkon.com';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePlayerSeekingPosts, useCreatePlayerSeekingPost, useDeletePlayerSeekingPost,
} from '@/hooks/usePlayerSeekingPosts';
import { useRegions } from '@/hooks/useRegions';
import { EventType, EVENT_TYPE_LABELS } from '@/types/events';
import { toast } from 'sonner';

const schema = z.object({
  player_name: z.string().trim().min(1, 'Name required').max(80),
  contact_email: z.string().trim().email('Invalid email').max(200),
  target_date: z.string().min(1, 'Date required'),
  region: z.string().trim().max(80).optional(),
  event_type: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export default function LookingForGame() {
  const { data: posts = [], isLoading } = usePlayerSeekingPosts();
  const { data: regionsData } = useRegions();
  const create = useCreatePlayerSeekingPost();
  const remove = useDeletePlayerSeekingPost();

  const [open, setOpen] = useState(false);
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [createdToken, setCreatedToken] = useState<{ id: string; token: string } | null>(null);

  const [form, setForm] = useState({
    player_name: '',
    contact_email: '',
    target_date: '',
    region: '',
    event_type: '',
    notes: '',
  });

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (filterRegion && p.region !== filterRegion) return false;
      if (filterType && p.event_type !== filterType) return false;
      return true;
    });
  }, [posts, filterRegion, filterType]);

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Looking for a Game',
    description: "Players post when they're looking for a walk-on paintball game by date and region. Venues and teams can fill spare slots.",
    url: `${SITE_ORIGIN}/looking-for-a-game`,
    inLanguage: 'en-GB',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: filtered.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${p.player_name} — ${format(parseISO(p.target_date), 'd MMM yyyy')}`,
        url: `${SITE_ORIGIN}/looking-for-a-game`,
      })),
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    const result = await create.mutateAsync({
      player_name: parsed.data.player_name,
      contact_email: parsed.data.contact_email,
      target_date: parsed.data.target_date,
      region: parsed.data.region || null,
      event_type: (parsed.data.event_type as EventType) || null,
      notes: parsed.data.notes || null,
    });
    setCreatedToken({ id: result.id, token: result.delete_token });
    setForm({ player_name: '', contact_email: '', target_date: '', region: '', event_type: '', notes: '' });
    setOpen(false);
  };

  const handleRemoveByToken = async (id: string, token: string) => {
    await remove.mutateAsync({ id, token });
    setCreatedToken(null);
  };

  return (
    <>
      <RouteHead
        title="Looking for a paintball game — Find A Walk-On"
        titleFull
        description="Players post when they're looking for a walk-on paintball game by date and region. Venues and teams can fill spare slots."
        path="/looking-for-a-game"
      >
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
      </RouteHead>
      <div className="min-h-screen bg-background">
        <header className="tactical-gradient border-b border-border/50">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground mb-4 -ml-2">
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Back to events</Link>
            </Button>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground inline-flex items-center gap-3">
              <UserSearch className="h-7 w-7 text-accent" /> Looking for a Game
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Post a quick "looking for a game on [date] near [city]" notice. Venues and teams browse here to fill spare walk-on slots.
            </p>
            <Button onClick={() => setOpen(true)} className="mt-4 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> Post a request
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Region</Label>
              <Select value={filterRegion || 'all'} onValueChange={(v) => setFilterRegion(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="All regions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {(regionsData?.regions ?? []).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Event type</Label>
              <Select value={filterType || 'all'} onValueChange={(v) => setFilterType(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Any type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any type</SelectItem>
                  {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                    <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 bg-card" />
          ) : filtered.length === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <UserSearch className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>No active posts yet. Be the first to post a request.</p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((p) => (
                <Card key={p.id} className="bg-card border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-lg text-foreground">{p.player_name}</h2>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(p.target_date), 'EEE d MMM yyyy')}
                      </span>
                    </div>
                    {p.region && (
                      <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-accent" /> {p.region}
                      </p>
                    )}
                    {p.event_type && (
                      <p className="text-xs text-accent">{EVENT_TYPE_LABELS[p.event_type as EventType]}</p>
                    )}
                    {p.notes && <p className="text-sm text-muted-foreground whitespace-pre-line">{p.notes}</p>}
                    <Button variant="outline" size="sm" className="gap-1 w-full" asChild>
                      <a href={`mailto:${p.contact_email}?subject=${encodeURIComponent('Re: paintball walk-on on ' + p.target_date)}`}>
                        <Mail className="h-3.5 w-3.5" /> Contact
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </ul>
          )}
        </main>
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post a request</DialogTitle>
            <DialogDescription>
              Tell venues and teams when and where you're looking to play. Active for 7 days after your target date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="lfg-name">Your name</Label>
              <Input id="lfg-name" value={form.player_name} maxLength={80} required
                onChange={(e) => setForm({ ...form, player_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="lfg-email">Email (shown so others can contact you)</Label>
              <Input id="lfg-email" type="email" value={form.contact_email} maxLength={200} required
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="lfg-date">Date you'd like to play</Label>
              <Input id="lfg-date" type="date" value={form.target_date} required
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="lfg-region">Region (optional)</Label>
              <Input id="lfg-region" placeholder="e.g. North West" value={form.region} maxLength={80}
                onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="lfg-type">Preferred format (optional)</Label>
              <Select value={form.event_type || 'any'} onValueChange={(v) => setForm({ ...form, event_type: v === 'any' ? '' : v })}>
                <SelectTrigger id="lfg-type" className="bg-input border-border"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                    <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lfg-notes">Notes (optional)</Label>
              <Textarea id="lfg-notes" value={form.notes} maxLength={500} rows={2}
                placeholder="Skill level, kit you have, group size…"
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Posting…' : 'Post request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Removal token confirmation */}
      <Dialog open={!!createdToken} onOpenChange={(o) => !o && setCreatedToken(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save your removal link</DialogTitle>
            <DialogDescription>
              Keep this link so you can remove your post later. We won't email it to you.
            </DialogDescription>
          </DialogHeader>
          {createdToken && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all">
                {`${window.location.origin}/looking-for-a-game?remove=${createdToken.id}&token=${createdToken.token}`}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-1 flex-1" onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/looking-for-a-game?remove=${createdToken.id}&token=${createdToken.token}`);
                  toast.success('Link copied');
                }}><Copy className="h-4 w-4" /> Copy link</Button>
                <Button variant="destructive" className="flex-1"
                  onClick={() => handleRemoveByToken(createdToken.id, createdToken.token)}>
                  Remove now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RemoveByQuery />
    </>
  );
}

/** Handles ?remove=<id>&token=<token> deep links so people can self-remove. */
function RemoveByQuery() {
  const remove = useDeletePlayerSeekingPost();
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const id = params.get('remove');
  const token = params.get('token');

  if (!id || !token) return null;

  const onConfirm = async () => {
    await remove.mutateAsync({ id, token });
    window.history.replaceState({}, '', '/looking-for-a-game');
  };

  return (
    <Dialog open onOpenChange={() => window.history.replaceState({}, '', '/looking-for-a-game')}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove your post?</DialogTitle>
          <DialogDescription>This will permanently delete the post.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.history.replaceState({}, '', '/looking-for-a-game')}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
