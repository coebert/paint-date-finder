import { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarDays, ExternalLink } from 'lucide-react';
import { parseISO, isBefore, startOfDay } from 'date-fns';
import { RouteHead } from '@/components/RouteHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCard } from '@/components/EventCard';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getCityBySlug, cityMatchTerms, citiesByRegion, type CityMeta } from '@/lib/cities';

const SITE_ORIGIN = 'https://findawalkon.com';

function useVenuesInCity(city: CityMeta) {
  return useQuery({
    queryKey: ['venues-by-city', city.slug],
    queryFn: async () => {
      const terms = cityMatchTerms(city);
      // Build an OR of location ILIKE per term, scoped to the city's region.
      const orClause = terms
        .map((t) => `location.ilike.%${t.replace(/[%,]/g, ' ')}%`)
        .join(',');
      const { data, error } = await supabase
        .from('venues')
        .select('id,name,slug,location,website,region')
        .eq('region', city.region)
        .or(orClause)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function CityPage() {
  const { slug } = useParams<{ slug: string }>();
  const city = getCityBySlug(slug);

  if (!city) {
    return <Navigate to="/paintball" replace />;
  }

  const { data: venues, isLoading: venuesLoading } = useVenuesInCity(city);
  const venueNames = useMemo(() => (venues ?? []).map((v) => v.name), [venues]);
  const { data: allEvents, isLoading: eventsLoading } = useEvents({
    verifiedOnly: false,
    regionVenues: venueNames.length ? venueNames : undefined,
  });

  const upcoming = useMemo(() => {
    if (!allEvents) return [];
    const today = startOfDay(new Date());
    return allEvents.filter((e) => !isBefore(parseISO(e.event_date), today)).slice(0, 30);
  }, [allEvents]);

  const path = `/paintball/city/${city.slug}`;
  const canonicalUrl = `${SITE_ORIGIN}${path}`;
  const title = `Paintball in ${city.name} — Walk-on events & venues`;
  const description =
    city.intro.length > 158 ? city.intro.slice(0, 155) + '…' : city.intro;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Paintball by region', item: `${SITE_ORIGIN}/paintball` },
      { '@type': 'ListItem', position: 3, name: city.region, item: `${SITE_ORIGIN}/paintball/${city.regionSlug}` },
      { '@type': 'ListItem', position: 4, name: city.name, item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Where can I play paintball in ${city.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Browse verified .68 caliber paintball venues in and around ${city.name} on this page. Each listing includes location, website and a direct booking link.`,
        },
      },
      {
        '@type': 'Question',
        name: `How much does paintball cost in ${city.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Walk-on entry near ${city.name} typically runs £15–£35 plus paintballs. Each event page shows the exact entry fee and paint price from the venue.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Can I turn up on my own (walk-on)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — walk-on events are designed for individuals and small teams to join scheduled game days without a group booking.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are events beginner-friendly?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Many sites near ' + city.name + ' offer hire gear and beginner-friendly walk-ons. Filter by beginner-friendly on the home page to see only suitable events.',
        },
      },
    ],
  };

  const nearbyCities = citiesByRegion(city.region).filter((c) => c.slug !== city.slug);

  return (
    <>
      <RouteHead title={title} titleFull description={description} path={path}>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </RouteHead>

      <div className="min-h-dvh bg-background">
        <header className="tactical-gradient border-b border-border/50">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground mb-4 -ml-2">
              <Link to={`/paintball/${city.regionSlug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {city.region}
              </Link>
            </Button>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground">
              Paintball in {city.name}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">{city.intro}</p>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              Part of{' '}
              <Link to={`/paintball/${city.regionSlug}`} className="text-primary hover:underline">
                paintball in {city.region}
              </Link>
              . Every venue is verified .68 caliber with a direct booking link.
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
          <section aria-labelledby="venues-heading">
            <h2 id="venues-heading" className="font-display text-2xl tracking-wide text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" /> Venues near {city.name}
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
                No verified venues listed yet for {city.name}.{' '}
                <Link to={`/paintball/${city.regionSlug}`} className="text-primary hover:underline">
                  See all {city.region} venues →
                </Link>
              </p>
            )}
          </section>

          <section aria-labelledby="events-heading">
            <h2 id="events-heading" className="font-display text-2xl tracking-wide text-foreground mb-3 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" /> Upcoming walk-on events near {city.name}
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
                No upcoming events listed for {city.name} right now.{' '}
                <Link to={`/paintball/${city.regionSlug}`} className="text-primary hover:underline">
                  Browse all {city.region} events →
                </Link>
              </p>
            )}
          </section>

          {nearbyCities.length > 0 && (
            <section className="border-t border-border/50 pt-6">
              <h2 className="font-display text-xl text-foreground mb-3">Other cities in {city.region}</h2>
              <div className="flex flex-wrap gap-2">
                {nearbyCities.map((c) => (
                  <Link key={c.slug} to={`/paintball/city/${c.slug}`}>
                    <Badge variant="outline" className="border-border/60 text-muted-foreground hover:text-foreground hover:border-accent">
                      Paintball in {c.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
