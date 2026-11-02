import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { AdminLayout } from '@/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, RefreshCw } from 'lucide-react';

type Row = {
  id: string; title: string; venue_name: string; event_date: string; event_type: string;
  source_url: string | null; source_quote: string | null; is_verified: boolean | null;
  verification_status: string; verification_notes: string | null; review_basis: string | null;
  quarantine_reason: string | null; last_verified_at: string | null; start_time: string | null;
  booking_url: string | null;
};

const STATUS_TEXT: Record<string, string> = {
  source_confirmed: 'Source confirmed',
  human_reviewed: 'Moderator reviewed',
  needs_evidence: 'Needs evidence',
  unverified: 'Unverified',
  verified: 'Legacy "verified"',
  stale: 'Excerpt gone from source',
  missing: 'Source unreachable',
  unavailable: 'Source unavailable',
  contradicted: 'Source contradicts date',
  quarantined: 'Hidden for review',
};

/** Why a listed event needs attention. Missing evidence is not proof it's fake. */
export function qualityReasons(r: Row): string[] {
  const out: string[] = [];
  if (!r.source_url) out.push('No source link');
  if (!r.source_quote) out.push('No source excerpt');
  if (r.verification_status === 'contradicted') out.push(r.verification_notes ?? 'Excerpt states a different date');
  if (r.verification_status === 'stale') out.push('Excerpt no longer on source page');
  if (r.verification_status === 'unavailable' || r.verification_status === 'missing') out.push('Source page could not be read');
  if (r.source_quote === 'CPPS season schedule (okpb.co.uk)') out.push('Excerpt is a placeholder, not copied from the source; times/booking link were filled by the importer');
  return out;
}

function useQualityRows() {
  return useQuery({
    queryKey: ['event-quality'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('events')
        .select('id,title,venue_name,event_date,event_type,source_url,source_quote,is_verified,verification_status,verification_notes,review_basis,quarantine_reason,last_verified_at,start_time,booking_url')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function RowCard({ r }: { r: Row }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'none' | 'quarantine' | 'reinstate'>('none');
  const [reason, setReason] = useState('');
  const [src, setSrc] = useState(r.source_url ?? '');
  const [quote, setQuote] = useState(r.source_quote ?? '');
  const act = useMutation({
    mutationFn: async () => {
      if (mode === 'quarantine') {
        const { error } = await supabase.rpc('quarantine_event', { _id: r.id, _reason: reason });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('reinstate_event', { _id: r.id, _source_url: src, _source_quote: quote, _note: reason });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(mode === 'quarantine' ? 'Hidden from the public calendar (reversible)' : 'Saved as moderator reviewed');
      setMode('none');
      setReason('');
      qc.invalidateQueries({ queryKey: ['event-quality'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reasons = qualityReasons(r);
  const quarantined = r.verification_status === 'quarantined';

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{r.title}</span>
          <Badge variant="outline">{STATUS_TEXT[r.verification_status] ?? r.verification_status}</Badge>
          {r.review_basis && <Badge variant="secondary" className="text-[10px]">basis: {r.review_basis.replace('_', ' ')}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(r.event_date), 'EEE dd/MM/yyyy')} · {r.venue_name}
        </p>
        {r.source_quote && <blockquote className="border-l-2 border-border pl-2 text-xs italic">“{r.source_quote}”</blockquote>}
        {reasons.length > 0 && (
          <ul className="text-xs text-accent list-disc pl-4">{reasons.map((x) => <li key={x}>{x}</li>)}</ul>
        )}
        {quarantined && r.quarantine_reason && <p className="text-xs text-destructive">Hidden: {r.quarantine_reason}</p>}
        <div className="flex flex-wrap gap-2">
          {r.source_url && (
            <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open source <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!quarantined && <Button size="sm" variant="outline" onClick={() => setMode('quarantine')}>Hide for review</Button>}
          <Button size="sm" variant="outline" onClick={() => setMode('reinstate')}>{quarantined ? 'Reinstate with evidence' : 'Add evidence'}</Button>
        </div>
        {mode !== 'none' && (
          <div className="space-y-2 rounded-md border border-border/50 p-3">
            {mode === 'reinstate' && (
              <>
                <Input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Organiser/venue page showing this date (https://…)" />
                <Textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Paste the exact line from that page that states this event and date" />
              </>
            )}
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={mode === 'quarantine' ? 'Precise reason (e.g. "Organiser page lists 15/11/2026, not 08/11/2026")' : 'Review note (what you checked)'} />
            <div className="flex gap-2">
              <Button size="sm" disabled={act.isPending} onClick={() => act.mutate()}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('none')}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminEventQuality() {
  const { data, isLoading, error, refetch } = useQualityRows();
  const [tab, setTab] = useState<'attention' | 'hidden' | 'confirmed'>('attention');
  const recheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reverify-events', { body: {} });
      if (error) throw error;
      return data as { checked: number; verified: number; flagged: number };
    },
    onSuccess: (d) => {
      toast.success(`Re-checked ${d.checked}: ${d.verified} confirmed, ${d.flagged} need attention`);
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = useMemo(() => {
    const rows = data ?? [];
    return {
      attention: rows.filter((r) => r.verification_status !== 'quarantined' && r.verification_status !== 'source_confirmed'),
      hidden: rows.filter((r) => r.verification_status === 'quarantined'),
      confirmed: rows.filter((r) => r.verification_status === 'source_confirmed'),
    };
  }, [data]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="font-display tracking-wider">EVENT QUALITY</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Upcoming listings and how well their source backs them up. A missing excerpt means the event
              needs checking, not that it is fake. Hiding is reversible and keeps all details and history.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Source confirmed: {groups.confirmed.length}</Badge>
              <Badge variant="outline">Needs attention: {groups.attention.length}</Badge>
              <Badge variant="outline">Hidden for review: {groups.hidden.length}</Badge>
            </div>
            <Button size="sm" variant="outline" disabled={recheck.isPending} onClick={() => recheck.mutate()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Re-check sources now
            </Button>
          </CardContent>
        </Card>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="attention">Needs attention</TabsTrigger>
            <TabsTrigger value="hidden">Hidden</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          </TabsList>
        </Tabs>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Couldn't load events.</p>
            <Button size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : groups[tab].length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <div className="space-y-3">{groups[tab].map((r) => <RowCard key={r.id} r={r} />)}</div>
        )}
      </div>
    </AdminLayout>
  );
}
