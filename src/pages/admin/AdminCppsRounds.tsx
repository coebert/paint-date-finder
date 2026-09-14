import { useMemo, useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { eventKeys } from '@/hooks/useEvents';
import { useCppsRounds } from '@/hooks/useCppsRounds';
import { RoundResultsCard } from '@/pages/admin/cpps/RoundResultsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarPlus, Loader2, Plus, Trash2, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  round: z.coerce.number().int().min(1, 'Round number is required').max(20),
  venue_name: z.string().trim().min(1, 'Venue is required').max(200),
  venue_location: z.string().trim().max(200),
  booking_url: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'Must be a full http(s) link'),
  price_info: z.string().trim().max(300),
  description: z.string().trim().max(2000),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')).min(1, 'Add at least one date'),
});

interface FormState {
  round: string;
  venue_name: string;
  venue_location: string;
  booking_url: string;
  price_info: string;
  description: string;
  dates: string[];
}

const DEFAULTS: FormState = {
  round: '',
  venue_name: 'CPPS Paintball',
  venue_location: 'Penkridge, Staffordshire',
  booking_url: 'https://www.okpb.co.uk/booking',
  price_info: '',
  description: '',
  dates: [''],
};

export default function AdminCppsRounds() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const { data: rounds, isLoading: roundsLoading } = useCppsRounds();

  const existingByRound = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const r of rounds ?? []) {
      map.set(r.round, new Set(r.events.map((e) => e.event_date)));
    }
    return map;
  }, [rounds]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setDate = (i: number, value: string) =>
    setForm((f) => ({ ...f, dates: f.dates.map((d, j) => (j === i ? value : d)) }));

  const addDate = () => setForm((f) => ({ ...f, dates: [...f.dates, ''] }));

  const removeDate = (i: number) =>
    setForm((f) => ({ ...f, dates: f.dates.filter((_, j) => j !== i) }));

  const existingDates = existingByRound.get(Number(form.round)) ?? new Set<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse({
      ...form,
      dates: form.dates.filter(Boolean),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }

    const { round, venue_name, venue_location, booking_url, price_info, description, dates } =
      parsed.data;
    const uniqueDates = [...new Set(dates)].sort();
    const already = existingByRound.get(round) ?? new Set<string>();
    const toInsert = uniqueDates.filter((d) => !already.has(d));
    const skipped = uniqueDates.length - toInsert.length;

    if (toInsert.length === 0) {
      toast.info(`Every date for Round ${round} is already in the calendar.`);
      return;
    }

    setSaving(true);
    try {
      const rows = toInsert.map((date, i) => ({
        title:
          toInsert.length > 1 ? `CPPS Round ${round} — Day ${i + 1}` : `CPPS Round ${round}`,
        description: description || null,
        event_type: 'tournament' as const,
        venue_name,
        venue_location: venue_location || null,
        event_date: date,
        start_time: '08:00',
        end_time: '18:00',
        booking_url: booking_url || null,
        price_info: price_info || null,
        is_verified: true,
        verification_status: 'verified',
        source_url: 'https://cpps.co.uk/',
        source_quote: 'Manually entered by admin',
      }));

      const { error } = await supabase.from('events').insert(rows);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['cpps-rounds'] });
      toast.success(
        `Round ${round}: added ${toInsert.length} date${toInsert.length === 1 ? '' : 's'}` +
          (skipped > 0 ? ` (${skipped} already existed)` : ''),
      );
      setForm((f) => ({ ...DEFAULTS, round: String(round + 1), venue_name: f.venue_name, venue_location: f.venue_location, booking_url: f.booking_url }));
    } catch (err) {
      toast.error('Failed to save: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="CPPS Rounds" description="Manually add CPPS round dates to the calendar.">
      <div className="p-6 max-w-4xl space-y-6">
        <header>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" aria-hidden />
            Enter round dates by hand so the calendar, list and CPPS tracker stay current even when
            the auto-scraper is out of credits.
          </p>
        </header>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" aria-hidden />
              Add a round
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cpps-round">Round number</Label>
                  <Input
                    id="cpps-round"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={form.round}
                    onChange={(e) => set('round', e.target.value)}
                    placeholder="e.g. 6"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpps-venue">Venue</Label>
                  <Input
                    id="cpps-venue"
                    required
                    maxLength={200}
                    value={form.venue_name}
                    onChange={(e) => set('venue_name', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpps-location">Location</Label>
                  <Input
                    id="cpps-location"
                    maxLength={200}
                    value={form.venue_location}
                    onChange={(e) => set('venue_location', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpps-booking">Booking link</Label>
                  <Input
                    id="cpps-booking"
                    type="url"
                    value={form.booking_url}
                    onChange={(e) => set('booking_url', e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cpps-price">Entry fee (optional)</Label>
                  <Input
                    id="cpps-price"
                    maxLength={300}
                    value={form.price_info}
                    onChange={(e) => set('price_info', e.target.value)}
                    placeholder="e.g. £300–£395 per team"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cpps-description">Description (optional)</Label>
                  <Textarea
                    id="cpps-description"
                    maxLength={2000}
                    rows={2}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dates</Label>
                {form.dates.map((d, i) => {
                  const dupe = d && existingDates.has(d);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={d}
                        onChange={(e) => setDate(i, e.target.value)}
                        className="max-w-52"
                        aria-label={`Date ${i + 1}`}
                      />
                      {dupe && (
                        <Badge variant="secondary" className="text-xs">
                          Already in calendar
                        </Badge>
                      )}
                      {form.dates.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDate(i)}
                          aria-label={`Remove date ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm" onClick={addDate}>
                  <Plus className="h-4 w-4 mr-1" /> Add another date
                </Button>
              </div>

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save round to calendar
              </Button>
            </form>
          </CardContent>
        </Card>

        <RoundResultsCard />

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wide">Rounds in the calendar</CardTitle>
          </CardHeader>
          <CardContent>
            {roundsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : rounds && rounds.length > 0 ? (
              <ul className="divide-y divide-border/40">
                {rounds.map((r) => (
                  <li key={r.round} className="py-3 flex flex-wrap items-center gap-2">
                    <span className="font-medium">Round {r.round}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(r.startDate, 'd MMM yyyy')}
                      {r.startDate.getTime() !== r.endDate.getTime() &&
                        ` – ${format(r.endDate, 'd MMM yyyy')}`}
                      {' · '}
                      {r.events.length} day{r.events.length === 1 ? '' : 's'} · {r.venueName}
                    </span>
                    {r.isPast ? (
                      <Badge variant="secondary">Played</Badge>
                    ) : (
                      <Badge className="bg-accent text-accent-foreground">Upcoming</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No CPPS rounds yet — add the first one above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
