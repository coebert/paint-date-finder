import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ImageWithSkeleton } from '@/components/ImageWithSkeleton';

/**
 * Visual regression: lock the structural contract of ImageWithSkeleton.
 * If any of these snapshots / assertions break, a sizing or preview-wrapper
 * regression has occurred and must be reviewed before shipping.
 */
describe('ImageWithSkeleton — visual contract', () => {
  it('renders skeleton overlay + img with lazy/async defaults', () => {
    const { container, getByRole } = render(
      <div className="relative h-16 w-16">
        <ImageWithSkeleton src="/x.png" alt="x" />
      </div>,
    );
    const img = getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.className).toMatch(/opacity-0/);
    expect(img.className).toMatch(/transition-opacity/);
    // Skeleton overlay present and absolutely positioned to fill parent
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).not.toBeNull();
    expect(skeleton!.className).toMatch(/absolute/);
    expect(skeleton!.className).toMatch(/inset-0/);
    expect(skeleton!.className).toMatch(/h-full/);
    expect(skeleton!.className).toMatch(/w-full/);
  });

  it('removes skeleton and fades img in once loaded', () => {
    const { container, getByRole } = render(
      <div className="relative h-16 w-16">
        <ImageWithSkeleton src="/x.png" alt="x" />
      </div>,
    );
    const img = getByRole('img') as HTMLImageElement;
    fireEvent.load(img);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(img.className).toMatch(/opacity-100/);
  });

  it('honours explicit loading="eager" override', () => {
    const { getByRole } = render(
      <div className="relative h-16 w-16">
        <ImageWithSkeleton src="/x.png" alt="x" loading="eager" />
      </div>,
    );
    expect(getByRole('img').getAttribute('loading')).toBe('eager');
  });

  it('matches structural snapshot (initial render)', () => {
    const { container } = render(
      <div className="relative h-16 w-16">
        <ImageWithSkeleton src="/x.png" alt="snap" />
      </div>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches structural snapshot (loaded state)', () => {
    const { container, getByRole } = render(
      <div className="relative h-16 w-16">
        <ImageWithSkeleton src="/x.png" alt="snap" />
      </div>,
    );
    fireEvent.load(getByRole('img'));
    expect(container.firstChild).toMatchSnapshot();
  });
});
