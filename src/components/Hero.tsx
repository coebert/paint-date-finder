import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroProps {
  onFindNearMe?: () => void;
  eventsCount?: number;
  venuesCount?: number;
}

/**
 * Above-the-fold hero band. Sits directly under the sticky header and provides
 * a strong headline, subtitle and two CTAs on top of a legible gradient scrim.
 * The scrim is critical — the site's fixed forest background is bright, so
 * body copy needs a dedicated dark overlay to hit AA contrast reliably.
 */
export function Hero({ onFindNearMe, eventsCount, venuesCount }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/50"
    >
      {/* Gradient scrim — top of page gets a deep base so body text is always
          readable; fades toward the page so the forest bleed still shows. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background/40"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--accent)/0.18),transparent_55%)]"
      />

      <div className="relative container mx-auto px-4 pt-10 pb-14 md:pt-16 md:pb-20">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-subtle" />
            UK paintball hub
          </p>
          <h1
            id="hero-heading"
            className="mt-4 font-display text-4xl leading-[0.95] text-foreground md:text-6xl lg:text-7xl"
            style={{ letterSpacing: '0.02em' }}
          >
            Find your next <span className="text-accent">walk-on</span> day.
          </h1>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-foreground/85">
            Every .68 caliber walk-on, scenario game and tournament across the UK — manually
            verified, mapped and filterable by date, region, venue and format.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onFindNearMe}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 h-12 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              Find events near me
            </button>
            <Link
              to="/?view=calendar"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-5 h-12 text-sm font-semibold text-foreground backdrop-blur transition hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Calendar className="h-4 w-4" aria-hidden />
              Browse the calendar
            </Link>
          </div>

          {(eventsCount ?? 0) > 0 && (
            <dl className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-baseline gap-2">
                <dt className="sr-only">Events listed</dt>
                <dd className="font-display text-2xl text-foreground">{eventsCount}</dd>
                <span>events</span>
              </div>
              <span aria-hidden className="text-border">•</span>
              <div className="flex items-baseline gap-2">
                <dt className="sr-only">Venues covered</dt>
                <dd className="font-display text-2xl text-foreground">{venuesCount ?? 0}</dd>
                <span>venues</span>
              </div>
              <span aria-hidden className="text-border">•</span>
              <span>100% community-verified</span>
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
