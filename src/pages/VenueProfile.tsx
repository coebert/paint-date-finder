import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Globe, Map as MapIcon, Sparkles, ScrollText } from 'lucide-react';
import { RouteHead } from '@/components/RouteHead';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EventCard } from '@/components/EventCard';
import { useVenueProfileBySlug } from '@/hooks/useVenueProfile';
import { useEvents } from '@/hooks/useEvents';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ImageWithSkeleton } from '@/components/ImageWithSkeleton';

const SITE_ORIGIN = 'https://findawalkon.com';

export default function VenueProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data: venue, isLoading } = useVenueProfileBySlug(slug);
  const { data: allEvents } = useEvents({ verifiedOnly: false });

  const upcoming = useMemo(() => {
    if (!venue || !allEvents) return [];
    const today = startOfDay(new Date());
    return allEvents
      .filter((e) => e.venue_name === venue.name && !isBefore(parseISO(e.event_date), today))
      .slice(0, 12);
  }, [allEvents, venue]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 py-6 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!venue) {
    return (
      <>
        <RouteHead title="Venue not found" description="This paintball venue could not be found." robots="noindex,follow" path={`/venues/${slug ?? ''}`} />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-display text-foreground mb-2">Venue not found</h1>
            <Button asChild variant="outline"><Link to="/">Back to events</Link></Button>
          </div>
        </div>
      </>
    );
  }

  const path = `/venues/${venue.slug ?? slug}`;
  const canonicalUrl = `${SITE_ORIGIN}${path}`;

  const placeSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: venue.name,
    url: canonicalUrl,
    sport: 'Paintball',
  };
  if (venue.location) {
    placeSchema.address = { '@type': 'PostalAddress', addressLocality: venue.location, addressCountry: 'GB' };
  }
  if (venue.latitude != null && venue.longitude != null) {
    placeSchema.geo = { '@type': 'GeoCoordinates', latitude: venue.latitude, longitude: venue.longitude };
  }
  if (venue.website) placeSchema.sameAs = [venue.website];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Events', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: venue.name, item: canonicalUrl },
    ],
  };

  const hirePriceEntries = Object.entries(venue.hire_prices ?? {}).filter(([, v]) => v !== '' && v != null);

  return (
    <>
      <RouteHead
        title={`${venue.name} — Paintball venue`}
        description={`${venue.name}${venue.location ? `, ${venue.location}` : ''}: upcoming walk-on dates, hire prices, walk-on rules and facilities.`}
        path={path}
      >
        <script type="application/ld+json">{JSON.stringify(placeSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </RouteHead>

      <div className="min-h-screen bg-background">
        <header className="tactical-gradient border-b border-border/50">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground mb-4 -ml-2">
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Back to events</Link>
            </Button>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground">{venue.name}</h1>
            {venue.location && (
              <p className="text-muted-foreground mt-2 inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-accent" /> {venue.location}
                {venue.region && <span className="text-muted-foreground/70">· {venue.region}</span>}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1" asChild>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + (venue.location ? ', ' + venue.location : ''))}`}
                   target="_blank" rel="noopener noreferrer">
                  <MapIcon className="h-4 w-4" /> View on Map
                </a>
              </Button>
              {venue.website && (
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1" asChild>
                  <a href={venue.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" /> Visit Website
                  </a>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
          {venue.facilities.length > 0 && (
            <section>
              <h2 className="font-display text-xl tracking-wide text-foreground mb-2">Facilities</h2>
              <div className="flex flex-wrap gap-2">
                {venue.facilities.map((f) => (
                  <Badge key={f} variant="secondary" className="text-sm">{f}</Badge>
                ))}
              </div>
            </section>
          )}

          {hirePriceEntries.length > 0 && (
            <section>
              <h2 className="font-display text-xl tracking-wide text-foreground mb-2 inline-flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" /> Hire & paint prices
              </h2>
              <div className="rounded-lg border border-border/50 bg-card divide-y divide-border/50">
                {hirePriceEntries.map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-foreground font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {venue.walk_on_rules && (
            <section>
              <h2 className="font-display text-xl tracking-wide text-foreground mb-2 inline-flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-accent" /> Walk-on rules
              </h2>
              <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">{venue.walk_on_rules}</p>
            </section>
          )}

          {venue.field_map_url && (
            <section>
              <h2 className="font-display text-xl tracking-wide text-foreground mb-2">Field map</h2>
              <ImageWithSkeleton src={venue.field_map_url} alt={`${venue.name} field map`}
                className="w-full rounded-lg border border-border object-contain max-h-[600px] bg-muted" />
            </section>
          )}

          {venue.gallery.length > 0 && (
            <section>
              <h2 className="font-display text-xl tracking-wide text-foreground mb-2">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {venue.gallery.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                     className="block rounded-md border border-border overflow-hidden bg-muted">
                    <ImageWithSkeleton src={url} alt={`${venue.name} photo ${i + 1}`}
                      className="w-full aspect-square object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-xl tracking-wide text-foreground mb-3">
              Upcoming events at {venue.name}
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events listed. Check back soon.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
