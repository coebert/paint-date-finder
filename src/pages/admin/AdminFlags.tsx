import { AdminLayout } from "@/layouts/AdminLayout";
import { useAdminEventFlags, useResolveFlag, useDeleteFlag, useApplySuggestedDate } from '@/hooks/useEventFlags';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle, Trash2, Flag, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';

const REASON_LABELS: Record<string, string> = {
  wrong_date: 'Wrong Date',
  cancelled: 'Cancelled',
  does_not_exist: 'Does Not Exist',
  wrong_venue: 'Wrong Venue',
  other: 'Other',
};

export default function AdminFlags() {
  const { data: flags, isLoading, error } = useAdminEventFlags();
  const resolveFlag = useResolveFlag();
  const deleteFlag = useDeleteFlag();
  const applySuggestedDate = useApplySuggestedDate();

  const unresolvedFlags = flags?.filter((f: any) => !f.is_resolved) ?? [];
  const resolvedFlags = flags?.filter((f: any) => f.is_resolved) ?? [];

  if (isLoading) {
    return (
      <AdminLayout title="EVENT FLAGS" description="Review and manage reported event issues">
        <Skeleton className="h-[500px] bg-card" />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="EVENT FLAGS" description="Review and manage reported event issues">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">Failed to load flags</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="EVENT FLAGS" description="Review and manage reported event issues">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{unresolvedFlags.length}</p>
              <p className="text-sm text-muted-foreground">Unresolved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{resolvedFlags.length}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unresolved Flags */}
      <h3 className="font-display text-lg tracking-wider text-foreground mb-3">UNRESOLVED FLAGS</h3>
      <Card className="bg-card border-border/50 mb-8">
        <CardContent className="p-0">
          {unresolvedFlags.length === 0 ? (
            <div className="py-12 text-center">
              <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No unresolved flags</p>
              <p className="text-muted-foreground">All reports have been addressed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Event</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unresolvedFlags.map((flag: any) => (
                    <TableRow key={flag.id} className="border-border/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{flag.events?.title ?? 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {flag.events?.venue_name}
                            {flag.events?.event_date && ` · ${format(new Date(flag.events.event_date), 'd MMM yyyy')}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-destructive/40 text-destructive">
                          {REASON_LABELS[flag.reason] ?? flag.reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-[280px]">
                          {flag.suggested_date && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <CalendarCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                              <span className="text-foreground font-medium">
                                Suggested: {format(new Date(flag.suggested_date), 'd MMM yyyy')}
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {flag.details || (flag.suggested_date ? '' : '—')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(flag.created_at), 'd MMM yyyy HH:mm')}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveFlag.mutate(flag.id)}
                            disabled={resolveFlag.isPending}
                            className="gap-1"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Resolve
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Flag</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete this flag report? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteFlag.mutate(flag.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Flags */}
      {resolvedFlags.length > 0 && (
        <>
          <h3 className="font-display text-lg tracking-wider text-muted-foreground mb-3">RESOLVED FLAGS</h3>
          <Card className="bg-card border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead>Event</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedFlags.map((flag: any) => (
                      <TableRow key={flag.id} className="border-border/50 opacity-60">
                        <TableCell>
                          <p className="font-medium">{flag.events?.title ?? 'Unknown'}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border">
                            {REASON_LABELS[flag.reason] ?? flag.reason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {flag.resolved_at ? format(new Date(flag.resolved_at), 'd MMM yyyy') : '—'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Flag</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Permanently delete this resolved flag report?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteFlag.mutate(flag.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="text-sm text-muted-foreground mt-4">
        Total: {flags?.length ?? 0} flags ({unresolvedFlags.length} unresolved, {resolvedFlags.length} resolved)
      </div>
    </AdminLayout>
  );
}
