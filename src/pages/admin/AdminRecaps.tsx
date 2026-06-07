import { AdminLayout } from '@/layouts/AdminLayout';
import {
  useAdminRecaps, useUpdateRecapStatus, useDeleteRecap,
} from '@/hooks/useEventRecaps';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Trash2, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AdminRecaps() {
  const { data: recaps = [], isLoading } = useAdminRecaps();
  const updateStatus = useUpdateRecapStatus();
  const del = useDeleteRecap();

  const pending = recaps.filter((r) => r.status === 'pending');
  const reviewed = recaps.filter((r) => r.status !== 'pending');

  if (isLoading) {
    return <AdminLayout title="EVENT RECAPS"><Skeleton className="h-64 bg-card" /></AdminLayout>;
  }

  const Row = ({ r }: { r: typeof recaps[number] }) => (
    <Card key={r.id} className="bg-card border-border/50">
      <CardContent className="p-4 flex flex-col md:flex-row items-start gap-3">
        <a href={r.media_url} target="_blank" rel="noopener noreferrer"
           className="block w-32 h-32 shrink-0 rounded-md border border-border bg-muted overflow-hidden">
          {r.media_type === 'image' ? (
            <img src={r.media_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">video</div>
          )}
        </a>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>
              {r.status}
            </Badge>
            <Badge variant="outline">{r.media_type}</Badge>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(r.created_at), 'd MMM yyyy HH:mm')}
            </span>
          </div>
          <p className="text-sm text-foreground"><span className="font-medium">{r.uploader_name}</span> · <span className="text-muted-foreground">{r.uploader_email}</span></p>
          {r.caption && <p className="text-sm text-muted-foreground">{r.caption}</p>}
          <a href={r.media_url} target="_blank" rel="noopener noreferrer"
             className="text-xs text-accent inline-flex items-center gap-1 break-all">
            <ExternalLink className="h-3 w-3" /> {r.media_url}
          </a>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {r.status !== 'approved' && (
            <Button size="sm" className="gap-1" onClick={() => updateStatus.mutate({ id: r.id, status: 'approved' })}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
          )}
          {r.status !== 'rejected' && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus.mutate({ id: r.id, status: 'rejected' })}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
          <Button size="sm" variant="destructive" className="gap-1" onClick={() => del.mutate(r.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="EVENT RECAPS" description="Moderate attendee-submitted photos and videos.">
      <h2 className="font-display text-xl mb-3 text-accent">Pending ({pending.length})</h2>
      <div className="space-y-3 mb-8">
        {pending.length === 0 ? <p className="text-muted-foreground text-sm">Nothing waiting.</p> : pending.map((r) => <Row key={r.id} r={r} />)}
      </div>
      <h2 className="font-display text-xl mb-3 text-muted-foreground">Reviewed ({reviewed.length})</h2>
      <div className="space-y-3">
        {reviewed.map((r) => <Row key={r.id} r={r} />)}
      </div>
    </AdminLayout>
  );
}
