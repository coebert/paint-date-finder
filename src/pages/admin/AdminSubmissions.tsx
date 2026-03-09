import { useState } from 'react';
import { AdminLayout } from "@/layouts/AdminLayout";
import { useSubmissions, useApproveSubmission, useRejectSubmission, useDeleteSubmission } from '@/hooks/useSubmissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Check, X, ExternalLink, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import type { EventSubmission } from '@/types/submissions';

function SubmissionCard({ submission, onApprove, onReject, onDelete }: {
  submission: EventSubmission;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes] = useState(submission.admin_notes || '');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    await onApprove(submission.id, notes);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(submission.id, notes);
    setIsProcessing(false);
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const StatusIcon = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
  }[submission.status];

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{submission.title}</CardTitle>
              <EventTypeBadge type={submission.event_type} />
              <Badge variant="outline" className={statusColors[submission.status]}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </Badge>
            </div>
            <CardDescription>
              Submitted by {submission.submitter_name || 'Anonymous'} ({submission.submitter_email})
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Date:</span>{' '}
              <span className="font-medium">{format(new Date(submission.event_date), 'PPP')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Venue:</span>{' '}
              <span className="font-medium">{submission.venue_name}</span>
            </div>
          </div>
          
          {submission.venue_location && (
            <div>
              <span className="text-muted-foreground">Location:</span>{' '}
              <span>{submission.venue_location}</span>
            </div>
          )}

          {(submission.start_time || submission.end_time) && (
            <div>
              <span className="text-muted-foreground">Time:</span>{' '}
              <span>
                {submission.start_time && format(new Date(`2000-01-01T${submission.start_time}`), 'HH:mm')}
                {submission.start_time && submission.end_time && ' - '}
                {submission.end_time && format(new Date(`2000-01-01T${submission.end_time}`), 'HH:mm')}
              </span>
            </div>
          )}

          {submission.description && (
            <div>
              <span className="text-muted-foreground">Description:</span>
              <p className="mt-1 text-foreground">{submission.description}</p>
            </div>
          )}

          {submission.price_info && (
            <div>
              <span className="text-muted-foreground">Price:</span>{' '}
              <span>{submission.price_info}</span>
            </div>
          )}

          <div className="flex gap-4 flex-wrap">
            {submission.booking_url && (
              <a
                href={submission.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline flex items-center gap-1"
              >
                Booking Link <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {submission.source_url && (
              <a
                href={submission.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline flex items-center gap-1"
              >
                Source Link <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Submitted: {format(new Date(submission.created_at), 'PPp')}
            {submission.reviewed_at && (
              <> · Reviewed: {format(new Date(submission.reviewed_at), 'PPp')}</>
            )}
          </div>
        </div>

        {submission.status === 'pending' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this submission..."
                className="bg-secondary/50"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve & Create Event
              </Button>
              <Button
                onClick={handleReject}
                disabled={isProcessing}
                variant="destructive"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </>
        )}

        {submission.status !== 'pending' && submission.admin_notes && (
          <div className="bg-secondary/30 rounded-lg p-3">
            <span className="text-sm font-medium text-muted-foreground">Admin Notes:</span>
            <p className="text-sm mt-1">{submission.admin_notes}</p>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border/50">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this submission? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(submission.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSubmissions() {
  const { data: submissions, isLoading, error } = useSubmissions();
  const approveSubmission = useApproveSubmission();
  const rejectSubmission = useRejectSubmission();
  const deleteSubmission = useDeleteSubmission();

  const pendingSubmissions = submissions?.filter(s => s.status === 'pending') || [];
  const reviewedSubmissions = submissions?.filter(s => s.status !== 'pending') || [];

  const handleApprove = async (id: string, notes: string) => {
    const submission = submissions?.find(s => s.id === id);
    if (!submission) return;
    
    try {
      await approveSubmission.mutateAsync({
        submission,
        adminNotes: notes,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      await rejectSubmission.mutateAsync({
        id,
        adminNotes: notes,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubmission.mutateAsync(id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="EVENT SUBMISSIONS" description="Review and manage community event submissions">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[300px] bg-card" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="EVENT SUBMISSIONS" description="Review and manage community event submissions">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">Failed to load submissions</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="EVENT SUBMISSIONS" description="Review and manage community event submissions">
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingSubmissions.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                {pendingSubmissions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({reviewedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">All caught up!</p>
                <p className="text-muted-foreground">No pending submissions to review.</p>
              </CardContent>
            </Card>
          ) : (
            pendingSubmissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {reviewedSubmissions.length === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No reviewed submissions yet.</p>
              </CardContent>
            </Card>
          ) : (
            reviewedSubmissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
