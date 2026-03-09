import { useState } from 'react';
import { useSubmissions, useApproveSubmission, useRejectSubmission, useDeleteSubmission } from '@/hooks/useSubmissions';
import { EventSubmission, SubmissionStatus, SUBMISSION_STATUS_LABELS } from '@/types/submissions';
import { EVENT_TYPE_LABELS } from '@/types/events';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Check, 
  X, 
  Trash2, 
  Calendar, 
  MapPin, 
  Clock, 
  Mail, 
  User,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { EventTypeBadge } from '@/components/EventTypeBadge';

export default function Submissions() {
  const [activeTab, setActiveTab] = useState<SubmissionStatus | 'all'>('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<EventSubmission | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: submissions, isLoading } = useSubmissions(
    activeTab === 'all' ? undefined : activeTab
  );

  const approveSubmission = useApproveSubmission();
  const rejectSubmission = useRejectSubmission();
  const deleteSubmission = useDeleteSubmission();

  const handleAction = async () => {
    if (!selectedSubmission || !actionType) return;

    switch (actionType) {
      case 'approve':
        await approveSubmission.mutateAsync({ 
          submission: selectedSubmission, 
          adminNotes: adminNotes || undefined 
        });
        break;
      case 'reject':
        await rejectSubmission.mutateAsync({ 
          id: selectedSubmission.id, 
          adminNotes: adminNotes || undefined 
        });
        break;
      case 'delete':
        await deleteSubmission.mutateAsync(selectedSubmission.id);
        break;
    }

    setSelectedSubmission(null);
    setActionType(null);
    setAdminNotes('');
  };

  const openAction = (submission: EventSubmission, action: 'approve' | 'reject' | 'delete') => {
    setSelectedSubmission(submission);
    setActionType(action);
    setAdminNotes('');
  };

  const getStatusBadgeVariant = (status: SubmissionStatus) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="tactical-gradient border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-3xl tracking-wider text-foreground">
                EVENT SUBMISSIONS
              </h1>
              <p className="text-sm text-muted-foreground">
                Review and manage user-submitted events
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SubmissionStatus | 'all')}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full bg-card" />
                ))}
              </div>
            ) : !submissions?.length ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <Card key={submission.id} className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <EventTypeBadge type={submission.event_type} />
                            <Badge variant={getStatusBadgeVariant(submission.status)}>
                              {SUBMISSION_STATUS_LABELS[submission.status]}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl">{submission.title}</CardTitle>
                        </div>
                        
                        {submission.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-accent text-accent-foreground hover:bg-accent/90"
                              onClick={() => openAction(submission, 'approve')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAction(submission, 'reject')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openAction(submission, 'delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 text-accent" />
                          {format(parseISO(submission.event_date), 'EEEE, d MMMM yyyy')}
                        </div>
                        
                        {submission.start_time && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 text-accent" />
                            {submission.start_time.slice(0, 5)}
                            {submission.end_time && ` - ${submission.end_time.slice(0, 5)}`}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 text-accent" />
                          {submission.venue_name}
                          {submission.venue_location && `, ${submission.venue_location}`}
                        </div>
                      </div>

                      {submission.description && (
                        <p className="text-sm text-muted-foreground">{submission.description}</p>
                      )}

                      {submission.price_info && (
                        <p className="text-sm font-medium text-primary">{submission.price_info}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {submission.submitter_email}
                        </div>
                        {submission.submitter_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {submission.submitter_name}
                          </div>
                        )}
                        {submission.booking_url && (
                          <a 
                            href={submission.booking_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Booking Link
                          </a>
                        )}
                        {submission.source_url && (
                          <a 
                            href={submission.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Source
                          </a>
                        )}
                        <span className="ml-auto">
                          Submitted {format(parseISO(submission.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>

                      {submission.admin_notes && (
                        <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Admin Notes:</p>
                          <p>{submission.admin_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' && 'Approve Submission'}
              {actionType === 'reject' && 'Reject Submission'}
              {actionType === 'delete' && 'Delete Submission'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' && 'This will add the event to the public calendar.'}
              {actionType === 'reject' && 'This submission will be marked as rejected.'}
              {actionType === 'delete' && 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(actionType === 'approve' || actionType === 'reject') && (
            <div className="py-2">
              <Textarea
                placeholder="Add notes (optional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionType === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {actionType === 'approve' && 'Approve'}
              {actionType === 'reject' && 'Reject'}
              {actionType === 'delete' && 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
