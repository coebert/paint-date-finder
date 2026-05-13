/**
 * HeroLogo — optimised <picture> for the site logo.
 *
 * Vite + react-router-dom doesn't have a Next-style `<Image>` component, so the
 * canonical pattern is to let `vite-imagetools` resize and re-encode at build
 * time and emit AVIF / WebP / PNG variants we serve via <picture>.
 *
 * The original logo is 1024×1024 PNG (~240 KB) but renders at ~80 px CSS, so
 * shipping the source is hugely wasteful. Here we generate 80 / 160 / 240 px
 * variants and let the browser pick the smallest format it supports.
 */
// @ts-expect-error vite-imagetools query string returns a typed picture object
import logo from '@/assets/logo.png?w=80;160;240&format=avif;webp;png&as=picture';

type PictureSource = { srcset: string; type?: string };
type PictureImport = {
  sources: Record<string, PictureSource[] | string>;
  img: { src: string; w: number; h: number };
};

const pic = logo as PictureImport;

interface HeroLogoProps {
  className?: string;
  /** Rendered (CSS) width in px — used for the intrinsic width attribute and `sizes`. */
  displayWidth?: number;
}

export function HeroLogo({ className, displayWidth = 80 }: HeroLogoProps) {
  // imagetools returns sources keyed by format. Some versions return strings,
  // others arrays of {srcset,type} — normalise to a flat list of <source> props.
  const orderedFormats = ['avif', 'webp', 'png'] as const;
  const sources = orderedFormats
    .map((fmt) => {
      const entry = pic.sources[fmt];
      if (!entry) return null;
      const srcset = Array.isArray(entry) ? entry[0]?.srcset : entry;
      if (!srcset) return null;
      return { type: `image/${fmt}`, srcset };
    })
    .filter(Boolean) as { type: string; srcset: string }[];

  const sizesAttr = `${displayWidth}px`;

  return (
    <picture>
      {sources.map((s) => (
        <source key={s.type} type={s.type} srcSet={s.srcset} sizes={sizesAttr} />
      ))}
      <img
        src={pic.img.src}
        alt="Find A Walk-On logo"
        width={pic.img.w}
        height={pic.img.h}
        sizes={sizesAttr}
        fetchPriority="high"
        decoding="async"
        className={className}
      />
    </picture>
  );
}
