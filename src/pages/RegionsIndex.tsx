import { Link } from 'react-router-dom';
import { MapPin, ArrowLeft } from 'lucide-react';
import { RouteHead } from '@/components/RouteHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ALL_REGIONS } from '@/lib/regions';
import { ALL_CITIES } from '@/lib/cities';

const SITE_ORIGIN = 'https://findawalkon.com';

export default function RegionsIndex() {
  const path = '/paintball';
  const canonicalUrl = `${SITE_ORIGIN}${path}`;
  const title = 'Paintball near me — Browse UK walk-on events by region';
  const description =
    'Find paintball walk-on events near you. Browse UK paintball venues and upcoming dates by region — South East, North West, Yorkshire, Scotland, Wales and more.';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Paintball by region', item: canonicalUrl },
    ],
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'UK paintball regions',
    itemListElement: ALL_REGIONS.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Paintball in ${r.name}`,
      url: `${SITE_ORIGIN}/paintball/${r.slug}`,
    })),
  };

  return (
    <>
      <RouteHead title={title} titleFull description={description} path={path}>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
      </RouteHead>

      <div className="min-h-dvh bg-background">
        <header className="tactical-gradient border-b border-border/50">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground mb-4 -ml-2">
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Back to events</Link>
            </Button>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground">
              Paintball near me — by UK region
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Pick a region to see verified walk-on paintball venues and upcoming events nearby.
              Every listing is community-verified .68 caliber with prices and booking links.
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_REGIONS.map((r) => (
              <li key={r.slug}>
                <Link
                  to={`/paintball/${r.slug}`}
                  className="block rounded-lg border border-border/60 bg-card/40 p-4 hover:border-accent hover:bg-card/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    <h2 className="font-display text-lg tracking-wide text-foreground">
                      Paintball in {r.name}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.intro}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {r.cities.slice(0, 4).map((c) => (
                      <Badge key={c} variant="outline" className="text-xs border-border/60 text-muted-foreground">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <section aria-labelledby="cities-heading" className="mt-10 border-t border-border/50 pt-6">
            <h2 id="cities-heading" className="font-display text-2xl tracking-wide text-foreground mb-3">
              Popular cities
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Jump straight to paintball walk-ons in the UK's biggest cities.
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_CITIES.map((c) => (
                <Link key={c.slug} to={`/paintball/city/${c.slug}`}>
                  <Badge variant="outline" className="border-border/60 text-muted-foreground hover:text-foreground hover:border-accent">
                    Paintball in {c.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
