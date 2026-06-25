import { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarDays, ExternalLink } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { RouteHead } from '@/components/RouteHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCard } from '@/components/EventCard';
import { useEvents } from '@/hooks/useEvents';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getRegionBySlug } from '@/lib/regions';

const SITE_ORIGIN = 'https://findawalkon.com';

function useVenuesInRegion(regionName: string) {
  return useQuery({
    queryKey: ['venues-by-region', regionName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('id,name,slug,location,website')
        .eq('region', regionName)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function RegionPage() {
  const { slug } = useParams<{ slug: string }>();
  const region = getRegionBySlug(slug);

  if (!region) {
    return <Navigate to="/paintball" replace />;
  }

  const { data: venues, isLoading: venuesLoading } = useVenuesInRegion(region.name);
  const venueNames = useMemo(() => (venues ?? []).map((v) => v.name), [venues]);
  const { data: allEvents, isLoading: eventsLoading } = useEvents({
    verifiedOnly: false,
    regionVenues: venueNames.length ? venueNames : undefined,
  });
  const { data: venueDetails } = useVenueDetails();

  const upcoming = useMemo(() => {
    if (!allEvents) return [];
    const today = startOfDay(new Date());
    return allEvents.filter((e) => !isBefore(parseISO(e.event_date), today)).slice(0, 30);
  }, [allEvents]);

  const path = `/paintball/${region.slug}`;
  const canonicalUrl = `${SITE_ORIGIN}${path}`;
  const title = `Paintball in ${region.name} — Walk-on events & venues`;
  const description = region.intro.length > 158 ? region.intro.slice(0, 155) + '…' : region.intro;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Paintball by region', item: `${SITE_ORIGIN}/paintball` },
      { '@type': 'ListItem', position: 3, name: region.name, item: canonicalUrl },
    ],
  };

  const itemListSchema = upcoming.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Upcoming paintball events in ${region.name}`,
        itemListElement: upcoming.slice(0, 20).map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_ORIGIN}/events/${e.id}`,
        })),
      }
    : null;

  return (
    <>
      <RouteHead title={title} titleFull description={description} path={path}>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {itemListSchema && (
          <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        )}
      </RouteHead>

      <div className="min-h-screen bg-background">
        <header className="tactical-gradient border-b border-border/50">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground mb-4 -ml-2">
              <Link to="/paintball"><ArrowLeft className="w-4 h-4 mr-2" />All regions</Link>
            </Button>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground">
              Paintball in {region.name}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">{region.intro}</p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {region.cities.map((c) => (
                <Badge key={c} variant="outline" className="border-border/60 text-muted-foreground">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
          <section aria-labelledby="venues-heading">
            <h2 id="venues-heading" className="font-display text-2xl tracking-wide text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" /> Venues in {region.name}
            </h2>
            {venuesLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : venues && venues.length > 0 ? (
              <ul className="grid sm:grid-cols-2 gap-3">
                {venues.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border/60 bg-card/40 p-3">
                    {v.slug ? (
                      <Link to={`/venues/${v.slug}`} className="font-medium text-foreground hover:text-accent">
                        {v.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{v.name}</span>
                    )}
                    {v.location && (
                      <p className="text-sm text-muted-foreground mt-0.5">{v.location}</p>
                    )}
                    {v.website && (
                      <a
                        href={v.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No verified venues listed yet for {region.name}.{' '}
                <Link to="/" className="text-primary hover:underline">Suggest one →</Link>
              </p>
            )}
          </section>

          <section aria-labelledby="events-heading">
            <h2 id="events-heading" className="font-display text-2xl tracking-wide text-foreground mb-3 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" /> Upcoming walk-on events
            </h2>
            {eventsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No upcoming events listed for {region.name} right now — check back soon or{' '}
                <Link to="/" className="text-primary hover:underline">browse all UK events</Link>.
              </p>
            )}
          </section>

          <section className="border-t border-border/50 pt-6">
            <h2 className="font-display text-xl text-foreground mb-2">Looking elsewhere?</h2>
            <p className="text-muted-foreground text-sm">
              <Link to="/paintball" className="text-primary hover:underline">Browse paintball by UK region →</Link>
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
