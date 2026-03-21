import { useState, useCallback } from 'react';
import { useEvents, useVenues } from '@/hooks/useEvents';
import { useRegions } from '@/hooks/useRegions';
import { EventType, PaintballEvent } from '@/types/events';
import { Header } from '@/components/Header';
import { EventFilters } from '@/components/EventFilters';
import { EventCalendar } from '@/components/EventCalendar';
import { EventList } from '@/components/EventList';
import { EventMap } from '@/components/EventMap';
import { EventEditDialog } from '@/components/EventEditDialog';
import { AddEventDialog } from '@/components/AddEventDialog';
import { EventDetailDialog } from '@/components/EventDetailDialog';
import { SubmitEventDialog } from '@/components/SubmitEventDialog';
import { SplashScreen } from '@/components/SplashScreen';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useVisitTracking } from '@/hooks/useVisitTracking';

export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const [view, setView] = useState<'calendar' | 'list' | 'map'>('calendar');
  const [eventType, setEventType] = useState<EventType | undefined>();
  const [venue, setVenue] = useState('');
  const [region, setRegion] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  
  // Track page visits
  useVisitTracking();
  
  const [editingEvent, setEditingEvent] = useState<PaintballEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<PaintballEvent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: regionsData } = useRegions();
  const regionVenues = region ? regionsData?.venuesByRegion.get(region) : undefined;

  const { data: events, isLoading, error } = useEvents({
    eventType,
    venue,
    verifiedOnly,
    regionVenues,
  });

  const { data: venues = [] } = useVenues();

  const handleEdit = (event: PaintballEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleEventClick = (event: PaintballEvent) => {
    setDetailEvent(event);
    setDetailDialogOpen(true);
  };

  const handleClearFilters = () => {
    setEventType(undefined);
    setVenue('');
    setRegion('');
    setVerifiedOnly(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        view={view} 
        onViewChange={setView} 
        onAddEvent={() => setAddDialogOpen(true)}
        onSubmitEvent={() => setSubmitDialogOpen(true)}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <EventFilters
          eventType={eventType}
          venue={venue}
          venues={venues}
          region={region}
          regions={regionsData?.regions || []}
          verifiedOnly={verifiedOnly}
          onEventTypeChange={setEventType}
          onVenueChange={setVenue}
          onRegionChange={setRegion}
          onVerifiedOnlyChange={setVerifiedOnly}
          onClearFilters={handleClearFilters}
        />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full bg-card" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive font-medium">Failed to load events</p>
            <p className="text-muted-foreground text-sm mt-1">Please try again later</p>
          </div>
        ) : (
          <>
            {view === 'calendar' && (
              <EventCalendar events={events || []} onEventClick={handleEventClick} />
            )}
            {view === 'list' && (
              <EventList events={events || []} onEdit={handleEdit} />
            )}
            {view === 'map' && (
              <EventMap events={events || []} onEventClick={handleEventClick} />
            )}
          </>
        )}

        {/* Stats footer */}
        {events && events.length > 0 && (
          <div className="text-center text-muted-foreground text-sm py-4 border-t border-border/50">
            Showing {events.length} events across {venues.length} venues
          </div>
        )}
      </main>

      <EventEditDialog
        event={editingEvent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AddEventDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <SubmitEventDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
      />

      <EventDetailDialog
        event={detailEvent}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEdit}
      />
    </div>
  );
}
