import { useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
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
import woodsballBg from '@/assets/woodsball-bg.jpg';


export default function Index() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));
  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
  }, []);
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
  const [submitInitialTab, setSubmitInitialTab] = useState<'flyer' | 'manual'>('flyer');
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

  const eventListJsonLd = useMemo(() => {
    const upcoming = (events ?? [])
      .filter((e) => new Date(e.event_date) >= new Date())
      .slice(0, 20);
    if (upcoming.length === 0) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: upcoming.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: e.title,
          startDate: e.start_time ? `${e.event_date}T${e.start_time}` : e.event_date,
          endDate: e.end_time ? `${e.event_date}T${e.end_time}` : undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          description: e.description ?? undefined,
          image: e.image_url ?? undefined,
          url: e.booking_url ?? `https://findawalkon.com/`,
          location: {
            '@type': 'Place',
            name: e.venue_name,
            address: e.venue_location ?? undefined,
          },
          organizer: { '@type': 'Organization', name: e.venue_name },
        },
      })),
    };
  }, [events]);

  return (
    <div className="min-h-screen bg-background relative">
      <Helmet>
        <title>Find A Walk-On | UK Paintball Events & Walk-On Days</title>
        <meta name="description" content="Find and book walk-on paintball events across the UK. Browse upcoming dates, venues and event types on a map, calendar or list." />
        <link rel="canonical" href="https://findawalkon.com/" />
        <link rel="preload" as="image" href={woodsballBg} fetchPriority="high" />
        <link rel="preload" as="image" href={logo} fetchPriority="high" />
        <meta property="og:title" content="Find A Walk-On | UK Paintball Events" />
        <meta property="og:description" content="Find and book walk-on paintball events across the United Kingdom." />
        <meta property="og:url" content="https://findawalkon.com/" />
        <meta property="og:type" content="website" />
        {eventListJsonLd && (
          <script type="application/ld+json">{JSON.stringify(eventListJsonLd)}</script>
        )}
      </Helmet>
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${woodsballBg})` }}
      />
      <div className="fixed inset-0 z-0 bg-background/35" />
      <div className="relative z-10">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Header 
        view={view} 
        onViewChange={setView} 
        onAddEvent={() => setAddDialogOpen(true)}
        onSubmitEvent={() => { setSubmitInitialTab('manual'); setSubmitDialogOpen(true); }}
        onImportFlyer={() => { setSubmitInitialTab('flyer'); setSubmitDialogOpen(true); }}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <section
          aria-labelledby="ai-summary-heading"
          data-ai-summary
          className="rounded-lg border border-border/50 bg-secondary/40 p-4 text-sm text-muted-foreground"
        >
          <h2 id="ai-summary-heading" className="text-base font-semibold text-foreground mb-1">
            About Find A Walk-On
          </h2>
          <p>
            Find A Walk-On is a UK directory of paintball walk-on events and teams. Browse upcoming
            manually-verified .68 caliber walk-ons by date, region, venue and format (Mag-Fed,
            Mechanical, Speedball and more), view them on a calendar or map, and discover CPPS
            League and other UK teams. All events are vetted by the community before listing.
          </p>
        </section>

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
        initialTab={submitInitialTab}
      />

      <EventDetailDialog
        event={detailEvent}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEdit}
      />
      </div>
    </div>
  );
}
