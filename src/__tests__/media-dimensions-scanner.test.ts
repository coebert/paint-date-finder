import { describe, it, expect } from 'vitest';
import { scanSource } from '../../scripts/check-media-dimensions';

/**
 * Unit tests for the parent-wrapper allowance in the media-dimensions scanner.
 * These ensure that sizing utilities applied to a wrapping JSX element
 * satisfy the CLS contract even when the media tag itself is unsized.
 */
describe('check-media-dimensions: parent-wrapper allowance', () => {
  it('flags an unsized <img> with no sized ancestor', () => {
    const src = `
      <div>
        <img src="/a.png" alt="a" />
      </div>
    `;
    const v = scanSource(src);
    expect(v).toHaveLength(1);
    expect(v[0].tag).toBe('img');
  });

  it('passes when parent has h-* AND w-* utilities', () => {
    const src = `
      <div className="relative h-20 w-20">
        <img src="/a.png" alt="a" />
      </div>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('passes when parent has aspect-* utility', () => {
    const src = `
      <div className="relative aspect-video">
        <img src="/a.png" alt="a" />
      </div>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('passes when parent has size-* shorthand', () => {
    const src = `
      <div className="relative size-12">
        <img src="/a.png" alt="a" />
      </div>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('passes when parent uses min-h-* and max-w-* utilities', () => {
    const src = `
      <div className="relative min-h-[200px] max-w-md min-w-[100px] max-h-[400px]">
        <iframe src="/x" />
      </div>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('uses the NEAREST ancestor — sized grandparent + unsized parent fails', () => {
    const src = `
      <section className="h-40 w-40">
        <div className="p-2">
          <img src="/a.png" alt="a" />
        </div>
      </section>
    `;
    const v = scanSource(src);
    expect(v).toHaveLength(1);
  });

  it('passes when innermost ancestor is sized even if outer ancestor is not', () => {
    const src = `
      <section className="p-4">
        <div className="h-40 w-40">
          <img src="/a.png" alt="a" />
        </div>
      </section>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('does not leak sizing across sibling subtrees', () => {
    const src = `
      <section>
        <div className="h-40 w-40"><img src="/ok.png" /></div>
        <div className="p-2"><img src="/bad.png" /></div>
      </section>
    `;
    const v = scanSource(src);
    expect(v).toHaveLength(1);
    expect(v[0].snippet).toContain('bad.png');
  });

  it('still passes when the tag itself is sized regardless of parent', () => {
    const src = `
      <div className="p-2">
        <img src="/a.png" className="h-10 w-10" />
      </div>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('applies parent-wrapper allowance to <video>, <iframe>, <embed>, <object>', () => {
    for (const tag of ['video', 'iframe', 'embed', 'object'] as const) {
      const src = `<div className="aspect-video"><${tag} src="/x" /></div>`;
      expect(scanSource(src), `tag=${tag}`).toEqual([]);
    }
  });
});
