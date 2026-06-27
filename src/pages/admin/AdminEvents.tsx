import { useState } from 'react';
import { AdminLayout } from "@/layouts/AdminLayout";
import { useEvents, useDeleteEvent } from '@/hooks/useEvents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertCircle, 
  Trash2, 
  Edit, 
  Plus, 
  Search,
  ExternalLink,
  Calendar as CalendarIcon,
  Layers,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import { AddEventDialog } from '@/components/AddEventDialog';
import { EventEditDialog } from '@/components/EventEditDialog';
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
import type { PaintballEvent } from '@/types/events';

export default function AdminEvents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PaintballEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dedupeRunning, setDedupeRunning] = useState(false);
  const queryClient = useQueryClient();

  const { data: events, isLoading, error } = useEvents({});
  const deleteEvent = useDeleteEvent();

  const handleDedupe = async (dryRun: boolean) => {
    if (!dryRun && !confirm(
      'Run deduplication on all events?\n\nThis will merge duplicates into the oldest matching event using the same fuzzy rules as the scraper (venue + date ±2 days + similar title). The duplicates will be deleted.'
    )) return;
    setDedupeRunning(true);
    const toastId = toast.loading(dryRun ? 'Scanning for duplicates…' : 'Merging duplicate events…');
    try {
      const { data, error } = await supabase.functions.invoke('dedupe-events-backfill', {
        body: { dryRun },
      });
      if (error) throw error;
      toast.success(
        dryRun
          ? `Found ${data?.duplicatesFound ?? 0} duplicates across ${data?.scanned ?? 0} events`
          : `Merged ${data?.merged ?? 0} duplicates (scanned ${data?.scanned ?? 0})`,
        { id: toastId },
      );
      if (!dryRun) queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (e) {
      toast.error((e as Error).message || 'Dedupe failed', { id: toastId });
    } finally {
      setDedupeRunning(false);
    }
  };
  const deleteEvent = useDeleteEvent();

  const filteredEvents = events?.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleEdit = (event: PaintballEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent.mutateAsync(id);
      toast.success('Event deleted successfully');
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="MANAGE EVENTS" description="View, edit, and delete events">
        <Skeleton className="h-[500px] bg-card" />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="MANAGE EVENTS" description="View, edit, and delete events">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">Failed to load events</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="MANAGE EVENTS" description="View, edit, and delete events">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50"
          />
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Events Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No events found</p>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Add your first event to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} className="border-border/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          {event.booking_url && (
                            <a
                              href={event.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline flex items-center gap-1"
                            >
                              Booking <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EventTypeBadge type={event.event_type} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(event.event_date), 'd MMM yyyy')}</p>
                          {event.start_time && (
                            <p className="text-muted-foreground text-xs">
                              {format(new Date(`2000-01-01T${event.start_time}`), 'HH:mm')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{event.venue_name}</p>
                          {event.venue_location && (
                            <p className="text-muted-foreground text-xs truncate max-w-[200px]">
                              {event.venue_location}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                          >
                            <Edit className="h-4 w-4" />
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
                                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{event.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(event.id)}
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

      <div className="text-sm text-muted-foreground mt-4">
        Showing {filteredEvents.length} of {events?.length || 0} events
      </div>

      <AddEventDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EventEditDialog 
        event={editingEvent} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </AdminLayout>
  );
}
