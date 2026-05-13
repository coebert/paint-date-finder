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

  it('passes via data-cls-exempt attribute', () => {
    const src = `<img src="/a.png" data-cls-exempt alt="a" />`;
    expect(scanSource(src)).toEqual([]);
  });

  it('passes via JSX comment {/* cls-exempt */}', () => {
    const src = `
      {/* cls-exempt */}
      <img src="/a.png" />
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('passes via HTML-style comment <!-- cls-exempt -->', () => {
    const src = `
      <!-- cls-exempt -->
      <img src="/a.png" />
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('does NOT exempt when comment is on a different unrelated line with other content between', () => {
    const src = `
      {/* cls-exempt */}
      <div> unrelated </div>
      <img src="/a.png" />
    `;
    const v = scanSource(src);
    expect(v).toHaveLength(1);
  });
});

describe('check-media-dimensions: nested wrapper resolution', () => {
  it('3 levels deep — innermost sized wrapper satisfies the rule', () => {
    const src = `
      <section>
        <article>
          <div className="h-32 w-32">
            <img src="/a.png" />
          </div>
        </article>
      </section>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('3 levels deep — only outermost sized, all inner unsized = FAILS (nearest wins)', () => {
    const src = `
      <section className="h-96 w-96">
        <article className="p-4">
          <div className="m-2">
            <img src="/a.png" />
          </div>
        </article>
      </section>
    `;
    const v = scanSource(src);
    expect(v).toHaveLength(1);
    expect(v[0].tag).toBe('img');
  });

  it('4 levels deep — middle wrapper sized, intermediate unsized — middle wins', () => {
    const src = `
      <section>
        <main className="aspect-video w-full">
          <article>
            <div>
              <img src="/a.png" />
            </div>
          </article>
        </main>
      </section>
    `;
    // The nearest ancestor (<div>) is unsized — should fail.
    const v = scanSource(src);
    expect(v).toHaveLength(1);
  });

  it('multiple sibling subtrees — each evaluated independently', () => {
    const src = `
      <section>
        <div className="h-20 w-20">
          <span><img src="/a.png" /></span>
        </div>
        <div className="h-20 w-20">
          <img src="/b.png" />
        </div>
        <div>
          <div className="h-20 w-20">
            <img src="/c.png" />
          </div>
        </div>
        <div>
          <span>
            <img src="/d.png" />
          </span>
        </div>
      </section>
    `;
    const v = scanSource(src);
    // Only /d.png has no sized ancestor in its chain
    expect(v).toHaveLength(1);
    expect(v[0].snippet).toContain('d.png');
  });

  it('mixed JSX components and DOM tags as wrappers', () => {
    const src = `
      <Card>
        <CardContent className="aspect-square">
          <img src="/a.png" />
        </CardContent>
      </Card>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('component wrapper without sizing className does not satisfy rule', () => {
    const src = `
      <Card>
        <CardContent>
          <img src="/a.png" />
        </CardContent>
      </Card>
    `;
    const v = scanSource(src);
    expect(v).toHaveLength(1);
  });

  it('self-closing siblings between sized parent and img do not break detection', () => {
    const src = `
      <div className="h-40 w-40">
        <input type="hidden" />
        <br />
        <img src="/a.png" />
      </div>
    `;
    expect(scanSource(src)).toEqual([]);
  });

  it('sized fragment-like wrapper followed by inner unsized wrapper = FAILS', () => {
    const src = `
      <div className="h-40 w-40">
        <header>
          <h2>Title</h2>
          <img src="/a.png" />
        </header>
      </div>
    `;
    // <header> is the nearest ancestor and is unsized → should fail.
    const v = scanSource(src);
    expect(v).toHaveLength(1);
  });

  it('back-to-back nested wrappers — each img resolves to its own nearest parent', () => {
    const src = `
      <div className="aspect-video">
        <div className="h-10 w-10"><img src="/inner-ok.png" /></div>
        <div><img src="/inner-bad.png" /></div>
      </div>
    `;
    const v = scanSource(src);
    expect(v).toHaveLength(1);
    expect(v[0].snippet).toContain('inner-bad.png');
  });

  it('aspect-* on a deeply nested intermediate wrapper is honored', () => {
    const src = `
      <section className="p-4">
        <div className="grid">
          <figure className="aspect-[16/9]">
            <img src="/a.png" />
          </figure>
        </div>
      </section>
    `;
    expect(scanSource(src)).toEqual([]);
  });
});
