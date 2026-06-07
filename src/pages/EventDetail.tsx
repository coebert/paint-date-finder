import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Calendar, MapPin, Clock, ExternalLink, Globe,
  CheckCircle, AlertCircle, Flag, Share2,
} from 'lucide-react';
import { RouteHead } from '@/components/RouteHead';
import { EventTypeBadge } from '@/components/EventTypeBadge';
import { EventSourceBadge } from '@/components/EventSourceBadge';
import { FlagEventDialog } from '@/components/FlagEventDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEventById } from '@/hooks/useEvents';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { EVENT_TYPE_LABELS } from '@/types/events';
import { toast } from 'sonner';

const SITE_ORIGIN = 'https://findawalkon.com';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useEventById(id);
  const { data: venueDetails } = useVenueDetails();
  const [flagOpen, setFlagOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <>
        <RouteHead
          title="Event not found"
          description="This paintball event could not be found on Find A Walk-On."
          robots="noindex,follow"
          path={`/events/${id ?? ''}`}
        />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-display text-foreground mb-2">Event not found</h1>
            <Button asChild variant="outline">
              <Link to="/">Back to events</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const path = `/events/${event.id}`;
  const canonicalUrl = `${SITE_ORIGIN}${path}`;
  const eventDate = parseISO(event.event_date);
  const venueWebsite = venueDetails?.get(event.venue_name)?.website ?? null;

  const startDate = event.start_time
    ? `${event.event_date}T${event.start_time}`
    : event.event_date;
  const endDate = event.end_time
    ? `${event.event_date}T${event.end_time}`
    : undefined;

  const venue = venueDetails?.get(event.venue_name) ?? null;

  const locationSchema: Record<string, unknown> = {
    '@type': 'Place',
    name: event.venue_name,
  };
  if (event.venue_location) {
    locationSchema.address = {
      '@type': 'PostalAddress',
      addressLocality: event.venue_location,
    };
  }
  if (venue?.latitude != null && venue?.longitude != null) {
    locationSchema.geo = {
      '@type': 'GeoCoordinates',
      latitude: venue.latitude,
      longitude: venue.longitude,
    };
  }

  const organizerSchema: Record<string, unknown> = {
    '@type': 'Organization',
    name: event.venue_name,
  };
  if (venue?.website) {
    organizerSchema.url = venue.website;
  }

  let extractedPrice: string | undefined;
  const priceMatch = event.price_info?.match(/£\s*(\d+(?:\.\d+)?)/);
  if (priceMatch) {
    extractedPrice = priceMatch[1];
  }

  const offersSchema = event.price_info || event.booking_url
    ? {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        url: event.booking_url ?? canonicalUrl,
        ...(event.price_info ? { description: event.price_info } : {}),
        ...(extractedPrice ? { price: extractedPrice, priceCurrency: 'GBP' } : {}),
      }
    : undefined;

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? `${EVENT_TYPE_LABELS[event.event_type]} paintball event at ${event.venue_name}.`,
    image: event.image_url ?? undefined,
    startDate,
    endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: 'en-GB',
    url: canonicalUrl,
    location: locationSchema,
    organizer: organizerSchema,
    about: { '@type': 'Thing', name: 'Paintball' },
    ...(offersSchema ? { offers: offersSchema } : {}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Events', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: event.title, item: canonicalUrl },
    ],
  };

  const description = (event.description?.trim()
    ? event.description.trim().slice(0, 155)
    : `${EVENT_TYPE_LABELS[event.event_type]} paintball at ${event.venue_name}${event.venue_location ? `, ${event.venue_location}` : ''} on ${format(eventDate, 'd MMM yyyy')}.`
  );

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `${event.title} — ${format(eventDate, 'd MMM yyyy')} at ${event.venue_name}`,
      url: canonicalUrl,
    };
    try {
      if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(shareData);
      } else {
        await navigator.clipboard.writeText(canonicalUrl);
        toast.success('Link copied to clipboard');
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <>
      <RouteHead
        title={`${event.title} — ${event.venue_name}`}
        description={description}
        path={path}
        ogType="article"
        ogImage={event.image_url || undefined}
      >
        <script type="application/ld+json">{JSON.stringify(eventSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </RouteHead>

      <div className="min-h-screen bg-background">
        <header className="tactical-gradient border-b border-border/50">
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground mb-4 -ml-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to events
              </Link>
            </Button>
            <EventTypeBadge type={event.event_type} className="mb-3" />
            <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground">
              {event.title}
            </h1>
            <p className="text-muted-foreground mt-2">
              {event.venue_name}{event.venue_location && `, ${event.venue_location}`}
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-3xl space-y-5">
          {event.image_url && (
            <img
              src={event.image_url}
              alt={`${event.title} flyer`}
              loading="lazy"
              className="w-full rounded-lg border border-border object-cover max-h-96"
            />
          )}

          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-accent" />
            <span className="font-medium">{format(eventDate, 'EEEE, d MMMM yyyy')}</span>
          </div>

          {event.start_time && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5 text-accent" />
              <span>
                {event.start_time.slice(0, 5)}
                {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5 text-accent" />
            <span>
              {event.venue_name}
              {event.venue_location && `, ${event.venue_location}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1" asChild>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_name + (event.venue_location ? ', ' + event.venue_location : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="h-4 w-4" /> View on Map
              </a>
            </Button>
            {venueWebsite && (
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1" asChild>
                <a href={venueWebsite} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" /> Visit Website
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1" onClick={handleShare}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          {event.price_info && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <p className="text-primary font-semibold">{event.price_info}</p>
            </div>
          )}

          {event.description && (
            <section>
              <h2 className="font-semibold text-foreground mb-1">Description</h2>
              <p className="text-muted-foreground whitespace-pre-line">{event.description}</p>
            </section>
          )}

          <EventSourceBadge sourceUrl={event.source_url} />

          <div className="flex items-center gap-2 text-sm">
            {event.is_verified ? (
              <>
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-primary">Verified event</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-accent" />
                <span className="text-accent">Unverified — dates may be approximate</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {event.booking_url && (
              <Button className="flex-1 min-w-[160px] bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <a href={event.booking_url} target="_blank" rel="noopener noreferrer">
                  Book Now <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFlagOpen(true)}
              className="text-muted-foreground hover:text-destructive gap-1"
            >
              <Flag className="h-4 w-4" /> Report
            </Button>
          </div>
        </main>

        <FlagEventDialog
          eventId={event.id}
          eventTitle={event.title}
          open={flagOpen}
          onOpenChange={setFlagOpen}
        />
      </div>
    </>
  );
}
