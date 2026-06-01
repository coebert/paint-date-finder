/**
 * HeroBackground — fixed full-viewport background rendered as a real <picture>
 * element so the browser can:
 *  - mark it as the LCP candidate (fetchpriority="high", loading="eager")
 *  - pick the right size from a responsive srcset (mobile gets 640w, not 1920w)
 *  - prefer AVIF, falling back to WebP and JPG
 *
 * Using a CSS background-image (image-set) hides the URL from Lighthouse's LCP
 * detector and from the preload scanner — switching to <img> is the single
 * biggest LCP win on this page.
 */
// @ts-expect-error vite-imagetools query string returns a typed picture object
import hero from '@/assets/woodsball-bg.jpg?w=640;1024;1536;1920&format=avif;webp;jpg&as=picture';

type PictureSource = { srcset: string; type?: string };
type PictureImport = {
  sources: Record<string, PictureSource[] | string>;
  img: { src: string; w: number; h: number };
};

const pic = hero as PictureImport;

const ORDERED = ['avif', 'webp', 'jpg'] as const;

function normaliseSource(entry: PictureSource[] | string | undefined): string | null {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  return entry[0]?.srcset ?? null;
}

export function HeroBackground() {
  return (
    <picture>
      {ORDERED.map((fmt) => {
        const srcset = normaliseSource(pic.sources[fmt]);
        if (!srcset) return null;
        return (
          <source
            key={fmt}
            type={`image/${fmt}`}
            srcSet={srcset}
            sizes="100vw"
          />
        );
      })}
      <img
        src={pic.img.src}
        alt=""
        aria-hidden="true"
        width={pic.img.w}
        height={pic.img.h}
        sizes="100vw"
        fetchPriority="high"
        decoding="async"
        loading="eager"
        className="fixed inset-0 z-0 h-full w-full object-cover"
      />
    </picture>
  );
}

/** Exposed for use in preload `<link>` tags (RouteHead). */
export const heroPreload = {
  avifSrcset: normaliseSource(pic.sources.avif),
  webpSrcset: normaliseSource(pic.sources.webp),
  jpgSrc: pic.img.src,
};
