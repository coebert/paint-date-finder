import { Helmet } from 'react-helmet-async';
import { ReactNode } from 'react';

const SITE_NAME = 'Find A Walk-On';
const SITE_ORIGIN = 'https://findawalkon.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;
const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;

export interface RouteHeadProps {
  /** Page title (will be appended with " | Find A Walk-On" unless `titleFull` is true). */
  title: string;
  /** If true, use `title` verbatim without appending the site name. */
  titleFull?: boolean;
  /** Meta description (50–160 chars recommended). */
  description: string;
  /** Path (starting with "/") for the canonical URL. Omit only if `noCanonical` is true. */
  path?: string;
  /** Override the canonical URL completely (takes precedence over `path`). */
  canonical?: string;
  /** Disable canonical emission entirely (rare — e.g. dynamic admin sub-views). */
  noCanonical?: boolean;
  /** Robots directive — defaults to "index,follow". Pass "noindex,nofollow" for auth/admin pages. */
  robots?: string;
  /** Open Graph type — defaults to "website". Use "article" for content pages. */
  ogType?: 'website' | 'article' | 'profile';
  /** Absolute URL of social-preview image. Defaults to /og-image.jpg. */
  ogImage?: string;
  /** Open Graph image width in pixels. Defaults to 1200. */
  ogImageWidth?: number;
  /** Open Graph image height in pixels. Defaults to 630. */
  ogImageHeight?: number;
  /** Twitter image alt text. Defaults to the page title. */
  twitterImageAlt?: string;
  /** Optional extra tags (JSON-LD scripts, additional meta, preloads, etc.). */
  children?: ReactNode;
}

/**
 * RouteHead — single source of truth for per-route <head> metadata.
 *
 * Generates title, description, robots, canonical and Open Graph tags in a
 * consistent shape across every page. Use this in route components instead of
 * hand-rolling <Helmet> blocks.
 */
export function RouteHead({
  title,
  titleFull = false,
  description,
  path,
  canonical,
  noCanonical = false,
  robots = 'index,follow',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageWidth = DEFAULT_OG_IMAGE_WIDTH,
  ogImageHeight = DEFAULT_OG_IMAGE_HEIGHT,
  twitterImageAlt,
  children,
}: RouteHeadProps) {
  const fullTitle = titleFull ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl =
    canonical ?? (path ? `${SITE_ORIGIN}${path}` : undefined);
  const imageAlt = twitterImageAlt ?? fullTitle;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      {!noCanonical && canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content={String(ogImageWidth)} />
      <meta property="og:image:height" content={String(ogImageHeight)} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {canonicalUrl && <meta name="twitter:url" content={canonicalUrl} />}
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {children}
    </Helmet>
  );
}

