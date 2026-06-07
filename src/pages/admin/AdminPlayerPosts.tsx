import { AdminLayout } from '@/layouts/AdminLayout';
import {
  useAdminPlayerSeekingPosts, useAdminDeletePlayerSeekingPost,
} from '@/hooks/usePlayerSeekingPosts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { EVENT_TYPE_LABELS, EventType } from '@/types/events';

export default function AdminPlayerPosts() {
  const { data: posts = [], isLoading } = useAdminPlayerSeekingPosts();
  const del = useAdminDeletePlayerSeekingPost();

  return (
    <AdminLayout title="LOOKING-FOR-A-GAME POSTS" description="Moderate player-seeking notices.">
      {isLoading ? (
        <Skeleton className="h-64 bg-card" />
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const expired = parseISO(p.expires_at) < new Date();
            return (
              <Card key={p.id} className="bg-card border-border/50">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg text-foreground">{p.player_name}</h3>
                      {expired && <span className="text-xs text-muted-foreground">expired</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(p.target_date), 'EEE d MMM yyyy')}
                      {p.region && ` · ${p.region}`}
                      {p.event_type && ` · ${EVENT_TYPE_LABELS[p.event_type as EventType]}`}
                    </p>
                    {p.notes && <p className="text-sm whitespace-pre-line">{p.notes}</p>}
                    <a href={`mailto:${p.contact_email}`} className="text-xs text-accent inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {p.contact_email}
                    </a>
                  </div>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => del.mutate(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
