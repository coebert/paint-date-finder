import { ImgHTMLAttributes, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ImageWithSkeletonProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Optional className applied to the Skeleton placeholder. Defaults to filling the parent. */
  skeletonClassName?: string;
}

/**
 * Renders an <img> with a Skeleton placeholder visible until the image loads.
 *
 * Requires a parent with reserved dimensions (h-*/w-* or aspect-*) to avoid
 * layout shift — same contract as the dimension lint rule.
 */
export function ImageWithSkeleton({
  className,
  skeletonClassName,
  onLoad,
  onError,
  src,
  ...rest
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <>
      {!loaded && !errored && (
        <Skeleton
          aria-hidden
          className={cn('absolute inset-0 h-full w-full', skeletonClassName)}
        />
      )}
      <img
        src={src}
        loading={rest.loading ?? 'lazy'}
        decoding={rest.decoding ?? 'async'}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setErrored(true);
          setLoaded(true);
          onError?.(e);
        }}
        {...rest}
      />
    </>
  );
}
