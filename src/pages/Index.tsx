import { useState, useCallback, useMemo } from 'react';
import { RouteHead } from '@/components/RouteHead';
import { useEvents, useVenues } from '@/hooks/useEvents';
import { useRegions } from '@/hooks/useRegions';
import { PaintballEvent } from '@/types/events';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { WeekendStrip } from '@/components/WeekendStrip';
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
import { useUserLocation } from '@/hooks/useUserLocation';
import { getVenueCoords, haversineMiles } from '@/lib/geo';
import { HeroBackground, heroPreload } from '@/components/HeroBackground';
import { Hero } from '@/components/Hero';
import { ALL_REGIONS } from '@/lib/regions';
import { Link } from 'react-router-dom';
import { useEventFiltersUrl } from '@/hooks/useEventFiltersUrl';


export default function Index() {
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== 'undefined' && !sessionStorage.getItem('splashShown'),
  );
  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
  }, []);

  const {
    view,
    eventType,
    beginnerOnly,
    venue,
    region,
    verifiedOnly,
    setView,
    setEventType,
    setBeginnerOnly,
    setVenue,
    setRegion,
    setVerifiedOnly,
    clearAll,
  } = useEventFiltersUrl();

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
    beginnerOnly,
    regionVenues,
  });

  const { data: venues = [] } = useVenues();

  const userLocation = useUserLocation(25);
  const { coords: userCoords, radiusMiles } = userLocation;

  // Apply radius filter at the page level so calendar/list/map all share it.
  const { displayedEvents, hiddenNoCoords } = useMemo(() => {
    const list = events ?? [];
    if (!userCoords) return { displayedEvents: list, hiddenNoCoords: 0 };
    let hidden = 0;
    const kept = list.filter((e) => {
      const vc = getVenueCoords(e.venue_name);
      if (!vc) {
        hidden += 1;
        return false;
      }
      return haversineMiles(userCoords, vc) <= radiusMiles;
    });
    return { displayedEvents: kept, hiddenNoCoords: hidden };
  }, [events, userCoords, radiusMiles]);

  const handleEdit = (event: PaintballEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleEventClick = (event: PaintballEvent) => {
    setDetailEvent(event);
    setDetailDialogOpen(true);
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
          ...(e.price_info
            ? {
                offers: {
                  '@type': 'Offer',
                  description: e.price_info,
                  availability: 'https://schema.org/InStock',
                  url: e.booking_url ?? undefined,
                },
              }
            : {}),
        },
      })),
    };
  }, [events]);

  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is a paintball walk-on?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A walk-on is a paintball event where individual players can turn up and join in without organising a group booking — perfect for solo players, small teams and anyone wanting more game time at .68 caliber.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where can I find paintball events near me in the UK?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Browse upcoming UK walk-on paintball events by region, venue, date or format on Find A Walk-On. Pick a region (South East, North West, Yorkshire, Scotland and more) or use the map view to spot events near you.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are these events for beginners?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Many walk-ons welcome beginners and offer hire gear. Filter to beginner-friendly events on the home page to see only events suitable for new players.',
          },
        },
        {
          '@type': 'Question',
          name: 'How are events verified?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every event listed on Find A Walk-On is manually checked and verified by the community before it appears in the calendar — no auto-imported or unverified dates.',
          },
        },
      ],
    }),
    [],
  );


  return (
    <div className="min-h-screen bg-background relative">
      <RouteHead
        title="Find A Walk-On | UK Paintball Events & Walk-On Days"
        titleFull
        description="Find and book walk-on paintball events across the UK. Browse upcoming dates, venues and event types on a map, calendar or list."
        path="/"
      >
        {/* Preload the responsive AVIF set so the browser can fetch the
            right-sized hero image before React mounts the <picture>. */}
        {heroPreload.avifSrcset && (
          <link
            rel="preload"
            as="image"
            type="image/avif"
            // @ts-expect-error React types lag the imagesrcset preload attrs
            imagesrcset={heroPreload.avifSrcset}
            imagesizes="100vw"
            fetchPriority="high"
          />
        )}
        {eventListJsonLd && (
          <script type="application/ld+json">{JSON.stringify(eventListJsonLd)}</script>
        )}
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </RouteHead>
      <HeroBackground />
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

      <Hero
        onFindNearMe={() => {
          const el = document.getElementById('near-me');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const input = el.querySelector<HTMLInputElement>('input');
            input?.focus();
          }
        }}
        eventsCount={events?.length ?? 0}
        venuesCount={venues.length}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <FilterBar
          eventType={eventType}
          beginnerOnly={beginnerOnly}
          venue={venue}
          venues={venues}
          region={region}
          regions={regionsData?.regions || []}
          verifiedOnly={verifiedOnly}
          location={userLocation}
          hiddenNoCoords={hiddenNoCoords}
          onEventTypeChange={setEventType}
          onBeginnerOnlyChange={setBeginnerOnly}
          onVenueChange={setVenue}
          onRegionChange={setRegion}
          onVerifiedOnlyChange={setVerifiedOnly}
          onClearAll={clearAll}
        />

        {!isLoading && !error && (
          <WeekendStrip events={displayedEvents} onEventClick={handleEventClick} />
        )}


        {/* Reserve a stable min-height for the dynamic view to avoid CLS
            when skeleton → real content swap, and when switching views. */}
        <div className="min-h-[720px]">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[720px] w-full bg-card" />
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
                <EventCalendar
                  events={displayedEvents}
                  onEventClick={handleEventClick}
                  userCoords={userCoords}
                />
              )}
              {view === 'list' && (
                <EventList
                  events={displayedEvents}
                  onEdit={handleEdit}
                  userCoords={userCoords}
                />
              )}
              {view === 'map' && (
                <EventMap events={displayedEvents} onEventClick={handleEventClick} />
              )}
            </>
          )}
        </div>

        {/* Stats footer */}
        {events && events.length > 0 && (
          <div className="text-center text-muted-foreground text-sm py-4 border-t border-border/50">
            Showing {events.length} events across {venues.length} venues
          </div>
        )}

        <section aria-labelledby="regions-heading" className="rounded-lg border border-border/50 bg-card/40 p-5 backdrop-blur-sm">
          <h2 id="regions-heading" className="font-display text-2xl tracking-wide text-foreground mb-3">
            Browse paintball by UK region
          </h2>
          <ul className="flex flex-wrap gap-2">
            {ALL_REGIONS.map((r) => (
              <li key={r.slug}>
                <Link
                  to={`/paintball/${r.slug}`}
                  className="inline-block rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-foreground hover:border-accent hover:text-accent transition-colors"
                >
                  Paintball in {r.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/paintball"
                className="inline-block rounded-full border border-accent/60 bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20 transition-colors"
              >
                See all regions →
              </Link>
            </li>
          </ul>
        </section>

        <section
          aria-labelledby="ai-summary-heading"
          data-ai-summary
          className="rounded-lg border border-border/50 bg-secondary/40 p-5 text-sm text-muted-foreground backdrop-blur-sm"
        >
          <h2 id="ai-summary-heading" className="font-display text-xl tracking-wide text-foreground mb-2">
            About Find A Walk-On
          </h2>
          <p>
            Find A Walk-On is a UK directory of paintball walk-on events and teams. Browse upcoming
            manually-verified .68 caliber walk-ons by date, region, venue and format (Mag-Fed,
            Mechanical, Speedball and more), view them on a calendar or map, and discover CPPS
            League and other UK teams. All events are vetted by the community before listing.
          </p>
        </section>
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
