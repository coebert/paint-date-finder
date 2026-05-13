import { describe, it, expect } from 'vitest';
import { scanSource, type ScanOptions } from '../../scripts/check-media-dimensions';

/* ─── Fixture builders ─── */

/** Build a JSX opening tag with optional className and/or style. */
function open(tag: string, opts?: { className?: string; style?: string }): string {
  const attrs: string[] = [];
  if (opts?.className) attrs.push(`className="${opts.className}"`);
  if (opts?.style) attrs.push(`style={${opts.style}}`);
  return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
}

function close(tag: string): string {
  return `</${tag}>`;
}

/** Nest children inside a wrapper tag. */
function wrap(tag: string, opts: { className?: string; style?: string }, children: string): string {
  return `${open(tag, opts)}\n${indent(children)}\n${close(tag)}`;
}

/** Create a raw wrapper with optional className/style. */
function raw(tag: string, children: string): string;
function raw(tag: string, opts: { className?: string; style?: string }, children: string): string;
function raw(tag: string, ...rest: any[]): string {
  if (rest.length === 1) {
    return `<${tag}>\n${indent(rest[0])}\n</${tag}>`;
  }
  const [opts, children] = rest as [{ className?: string; style?: string }, string];
  const attrs: string[] = [];
  if (opts.className) attrs.push(`className="${opts.className}"`);
  if (opts.style) attrs.push(`style={${opts.style}}`);
  const openTag = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  return `${openTag}\n${indent(children)}\n</${tag}>`;
}

/** Shorthand for an <img> tag. */
function img(src = '/a.png', extra = ''): string {
  return `<img src="${src}"${extra ? ' ' + extra : ''} />`;
}

/** Generic media tag factory. */
function media(tag: string, extra = ''): string {
  return `<${tag}${extra ? ' ' + extra : ''} />`;
}

function indent(s: string, n = 2): string {
  return s
    .split('\n')
    .map((l) => (l.trim() === '' ? '' : ' '.repeat(n) + l))
    .join('\n');
}

/** Assertion helpers */
function expectPasses(src: string, msg?: string, scanOpts?: ScanOptions) {
  expect(scanSource(src, '<inline>', scanOpts), msg).toEqual([]);
}
function expectFails(src: string, opts?: { tag?: string; contains?: string; count?: number; scanOpts?: ScanOptions }) {
  const v = scanSource(src, '<inline>', opts?.scanOpts);
  if (opts?.count !== undefined) expect(v).toHaveLength(opts.count);
  else expect(v.length).toBeGreaterThan(0);
  if (opts?.tag) expect(v[0].tag).toBe(opts.tag);
  if (opts?.contains) expect(v[0].snippet).toContain(opts.contains);
}

/* ─── Tests ─── */

describe('check-media-dimensions: parent-wrapper allowance', () => {
  it('flags an unsized <img> with no sized ancestor', () => {
    expectFails(raw('div', img()), { tag: 'img' });
  });

  it('passes when parent has h-* AND w-* utilities', () => {
    expectPasses(wrap('div', { className: 'relative h-20 w-20' }, img()));
  });

  it('passes when parent has aspect-* utility', () => {
    expectPasses(wrap('div', { className: 'relative aspect-video' }, img()));
  });

  it('passes when parent has size-* shorthand', () => {
    expectPasses(wrap('div', { className: 'relative size-12' }, img()));
  });

  it('passes when parent uses min-h-* and max-w-* utilities', () => {
    expectPasses(
      wrap('div', { className: 'relative min-h-[200px] max-w-md min-w-[100px] max-h-[400px]' },
        media('iframe', 'src="/x"')),
    );
  });

  it('uses the NEAREST ancestor — sized grandparent + unsized parent fails', () => {
    const src = wrap('section', { className: 'h-40 w-40' },
      raw('article',
        raw('div', img())
      )
    );
    expectFails(src, { tag: 'img' });
  });

  it('passes when innermost ancestor is sized even if outer ancestor is not', () => {
    const src = raw('section',
      wrap('div', { className: 'h-40 w-40' }, img())
    );
    expectPasses(src);
  });

  it('does not leak sizing across sibling subtrees', () => {
    const src = `<section>
  ${wrap('div', { className: 'h-40 w-40' }, img('/ok.png'))}
  ${raw('div', img('/bad.png'))}
</section>`;
    expectFails(src, { contains: 'bad.png', count: 1 });
  });

  it('still passes when the tag itself is sized regardless of parent', () => {
    const src = raw('div', { className: 'p-2' },
      img('/a.png', 'className="h-10 w-10"')
    );
    expectPasses(src);
  });

  it('applies parent-wrapper allowance to <video>, <iframe>, <embed>, <object>', () => {
    for (const tag of ['video', 'iframe', 'embed', 'object'] as const) {
      expectPasses(
        wrap('div', { className: 'aspect-video' }, media(tag, 'src="/x"')),
        `tag=${tag}`,
      );
    }
  });

  it('passes via data-cls-exempt attribute', () => {
    expectPasses(img('/a.png', 'data-cls-exempt alt="a"'));
  });

  it('passes via JSX comment {/* cls-exempt */}', () => {
    const src = `{/* cls-exempt */}\n<img src="/a.png" />`;
    expectPasses(src);
  });

  it('passes via HTML-style comment <!-- cls-exempt -->', () => {
    const src = `<!-- cls-exempt -->\n<img src="/a.png" />`;
    expectPasses(src);
  });

  it('does NOT exempt when comment is on a different unrelated line with other content between', () => {
    const src = `{/* cls-exempt */}\n<div> unrelated </div>\n<img src="/a.png" />`;
    expectFails(src, { count: 1 });
  });
});

describe('check-media-dimensions: nested wrapper resolution', () => {
  it('3 levels deep — innermost sized wrapper satisfies the rule', () => {
    const src = raw('section',
      raw('article',
        wrap('div', { className: 'h-32 w-32' }, img())
      )
    );
    expectPasses(src);
  });

  it('3 levels deep — only outermost sized, all inner unsized = FAILS (nearest wins)', () => {
    const src = wrap('section', { className: 'h-96 w-96' },
      raw('article', { className: 'p-4' },
        raw('div', { className: 'm-2' }, img())
      )
    );
    expectFails(src, { tag: 'img' });
  });

  it('4 levels deep — middle wrapper sized, intermediate unsized — middle wins', () => {
    const src = raw('section',
      wrap('main', { className: 'aspect-video w-full' },
        raw('article',
          raw('div', img())
        )
      )
    );
    // The nearest ancestor (<div>) is unsized — should fail.
    expectFails(src, { count: 1 });
  });

  it('multiple sibling subtrees — each evaluated against its own nearest parent', () => {
    const src = `<section>
  ${wrap('div', { className: 'h-20 w-20' }, img('/a.png'))}
  ${wrap('div', { className: 'h-20 w-20' }, img('/b.png'))}
  ${raw('div', wrap('div', { className: 'h-20 w-20' }, img('/c.png')))}
  ${raw('div', raw('span', img('/d.png')))}
</section>`;
    // a, b, c all have a sized nearest parent. d's nearest parent is <span> (unsized).
    expectFails(src, { contains: 'd.png', count: 1 });
  });

  it('mixed JSX components and DOM tags as wrappers', () => {
    const src = raw('Card',
      wrap('CardContent', { className: 'aspect-square' }, img())
    );
    expectPasses(src);
  });

  it('component wrapper without sizing className does not satisfy rule', () => {
    const src = raw('Card',
      raw('CardContent', img())
    );
    expectFails(src, { count: 1 });
  });

  it('self-closing siblings between sized parent and img do not break detection', () => {
    const src = wrap('div', { className: 'h-40 w-40' },
      `<input type="hidden" />\n<br />\n${img()}`
    );
    expectPasses(src);
  });

  it('sized fragment-like wrapper followed by inner unsized wrapper = FAILS', () => {
    const src = wrap('div', { className: 'h-40 w-40' },
      `<header>\n  <h2>Title</h2>\n  ${img()}\n</header>`
    );
    // <header> is the nearest ancestor and is unsized → should fail.
    expectFails(src, { count: 1 });
  });

  it('back-to-back nested wrappers — each img resolves to its own nearest parent', () => {
    const src = wrap('div', { className: 'aspect-video' },
      `${wrap('div', { className: 'h-10 w-10' }, img('/inner-ok.png'))}\n${raw('div', img('/inner-bad.png'))}`
    );
    expectFails(src, { contains: 'inner-bad.png', count: 1 });
  });

  it('aspect-* on a deeply nested intermediate wrapper is honored', () => {
    const src = raw('section', { className: 'p-4' },
      raw('div', { className: 'grid' },
        wrap('figure', { className: 'aspect-[16/9]' }, img())
      )
    );
    expectPasses(src);
  });

  it('passes when nearest parent has style={{ aspectRatio: ... }}', () => {
    expectPasses(wrap('div', { style: "{ aspectRatio: '16/9' }" }, img()));
  });

  it('passes when nearest parent has style={{ aspectRatio: 16/9 }} (numeric)', () => {
    expectPasses(wrap('div', { style: '{ aspectRatio: 16 / 9 }' }, img()));
  });

  it('fails when a grandparent has style={{ aspectRatio }} but nearest parent does not', () => {
    const src = wrap('section', { style: "{ aspectRatio: '16/9' }" },
      raw('div', img())
    );
    expectFails(src, { tag: 'img' });
  });

  it('style aspectRatio on parent takes precedence over unsized className on parent', () => {
    expectPasses(wrap('div', { className: 'p-4', style: "{ aspectRatio: '4/3' }" }, img()));
  });
});

describe('check-media-dimensions: Tailwind arbitrary value patterns', () => {
  it('w-[42px] + h-[24rem] on tag passes', () => {
    expectPasses(img('/a.png', 'className="w-[42px] h-[24rem]"'));
  });

  it('aspect-[9/16] on tag passes', () => {
    expectPasses(img('/a.png', 'className="aspect-[9/16]"'));
  });

  it('w-[calc(100vh-4rem)] + h-[50%] on parent wrapper passes', () => {
    expectPasses(
      wrap('div', { className: 'w-[calc(100vh-4rem)] h-[50%]' }, img()),
    );
  });

  it('min-w-[200px] + max-h-[50vh] on parent passes', () => {
    expectPasses(
      wrap('div', { className: 'min-w-[200px] max-h-[50vh]' }, img()),
    );
  });

  it('size-[100%] on tag passes', () => {
    expectPasses(img('/a.png', 'className="size-[100%]"'));
  });

  it('w-[clamp(100px,50%,200px)] on tag passes', () => {
    expectPasses(img('/a.png', 'className="w-[clamp(100px,50%,200px)] h-[24rem]"'));
  });

  it('h-[calc(100vh_-_4rem)] with underscores for spaces passes', () => {
    expectPasses(
      wrap('div', { className: 'h-[calc(100vh_-_4rem)] w-[50vw]' }, img()),
    );
  });

  it('fractional non-arbitrary w-1/2 + h-3/4 passes', () => {
    expectPasses(img('/a.png', 'className="w-1/2 h-3/4"'));
  });

  it('parent with only w-[200px] but no h-* still fails', () => {
    expectFails(
      wrap('div', { className: 'w-[200px]' }, img()),
      { count: 1 },
    );
  });

  it('parent with aspect-[21/9] arbitrary passes', () => {
    expectPasses(
      wrap('div', { className: 'aspect-[21/9]' }, media('iframe', 'src="/x"')),
    );
  });
});

/* ─── Snapshot-style assertions ─── */

/**
 * Strip volatile fields (file path) so snapshots remain stable across environments.
 * Returns a deterministic, structurally-comparable shape suitable for `toMatchInlineSnapshot`.
 */
function shape(src: string, scanOpts?: ScanOptions) {
  return scanSource(src, '<inline>', scanOpts).map((v) => ({
    line: v.line,
    tag: v.tag,
    snippet: v.snippet,
    nearestParent: v.nearestParent,
  }));
}

describe('check-media-dimensions: snapshot-style nested-wrapper assertions', () => {
  it('unsized <img> inside bare <div> — captures exact snippet + nearest parent', () => {
    expect(shape(raw('div', img()))).toMatchInlineSnapshot(`
      [
        {
          "line": 2,
          "nearestParent": {
            "className": "",
            "style": "",
            "tag": "div",
          },
          "snippet": "<img src="/a.png" />",
          "tag": "img",
        },
      ]
    `);
  });

  it('3-level nest where only outer is sized — nearest parent is the unsized <div>', () => {
    const src = wrap('section', { className: 'h-96 w-96' },
      raw('article', { className: 'p-4' },
        raw('div', { className: 'm-2' }, img('/b.png'))
      )
    );
    expect(shape(src)).toMatchInlineSnapshot(`
      [
        {
          "line": 4,
          "nearestParent": {
            "className": "m-2",
            "style": "",
            "tag": "div",
          },
          "snippet": "<img src="/b.png" />",
          "tag": "img",
        },
      ]
    `);
  });

  it('siblings — only one fails, snapshot pinpoints it with its nearest parent', () => {
    const src = `<section>
  ${wrap('div', { className: 'h-20 w-20' }, img('/ok.png'))}
  ${raw('span', img('/bad.png'))}
</section>`;
    expect(shape(src)).toMatchInlineSnapshot(`
      [
        {
          "line": 6,
          "nearestParent": {
            "className": "",
            "style": "",
            "tag": "span",
          },
          "snippet": "<img src="/bad.png" />",
          "tag": "img",
        },
      ]
    `);
  });

  it('component wrapper without sizing — nearest parent is the JSX component name', () => {
    const src = raw('Card',
      raw('CardContent', img())
    );
    expect(shape(src)).toMatchInlineSnapshot(`
      [
        {
          "line": 3,
          "nearestParent": {
            "className": "",
            "style": "",
            "tag": "CardContent",
          },
          "snippet": "<img src="/a.png" />",
          "tag": "img",
        },
      ]
    `);
  });

  it('grandparent has aspectRatio style but nearest <div> does not — snapshot shows the unsized parent', () => {
    const src = wrap('section', { style: "{ aspectRatio: '16/9' }" },
      raw('div', img())
    );
    expect(shape(src)).toMatchInlineSnapshot(`
      [
        {
          "line": 3,
          "nearestParent": {
            "className": "",
            "style": "",
            "tag": "div",
          },
          "snippet": "<img src="/a.png" />",
          "tag": "img",
        },
      ]
    `);
  });

  it('two nested unsized wrappers, two media tags — both violations captured with their parents', () => {
    const src = raw('section',
      `${raw('div', img('/one.png'))}\n${raw('span', media('iframe', 'src="/two"'))}`
    );
    expect(shape(src)).toMatchInlineSnapshot(`
      [
        {
          "line": 3,
          "nearestParent": {
            "className": "",
            "style": "",
            "tag": "div",
          },
          "snippet": "<img src="/one.png" />",
          "tag": "img",
        },
        {
          "line": 6,
          "nearestParent": {
            "className": "",
            "style": "",
            "tag": "span",
          },
          "snippet": "<iframe src="/two" />",
          "tag": "iframe",
        },
      ]
    `);
  });

  it('back-to-back wrappers — sized sibling passes, unsized sibling captured with exact parent class', () => {
    const src = wrap('div', { className: 'aspect-video' },
      `${wrap('div', { className: 'h-10 w-10' }, img('/inner-ok.png'))}\n${raw('div', { className: 'm-2' }, img('/inner-bad.png'))}`
    );
    expect(shape(src)).toMatchInlineSnapshot(`
      [
        {
          "line": 6,
          "nearestParent": {
            "className": "m-2",
            "style": "",
            "tag": "div",
          },
          "snippet": "<img src="/inner-bad.png" />",
          "tag": "img",
        },
      ]
    `);
  });
});

describe('check-media-dimensions: any-sized-ancestor strategy', () => {
  it('passes when ANY ancestor is sized even if nearest parent is not', () => {
    const src = wrap('section', { className: 'h-96 w-96' },
      raw('article', { className: 'p-4' },
        raw('div', { className: 'm-2' }, img('/deep.png'))
      )
    );
    // nearest strategy fails because nearest parent <div> is unsized
    expectFails(src, { tag: 'img', contains: '/deep.png', count: 1 });
    // any strategy passes because <section> is sized
    expectPasses(src, 'any strategy passes', { parentStrategy: 'any' });
  });

  it('still fails under any strategy when no ancestor is sized', () => {
    const src = raw('section',
      raw('article', { className: 'p-4' },
        raw('div', { className: 'm-2' }, img('/deep.png'))
      )
    );
    expectFails(src, { tag: 'img', contains: '/deep.png', count: 1 });
    expectFails(src, { tag: 'img', contains: '/deep.png', count: 1, scanOpts: { parentStrategy: 'any' } });
  });

  it('grandparent aspectRatio style satisfies any strategy', () => {
    const src = wrap('section', { style: "{ aspectRatio: '16/9' }" },
      raw('div', img())
    );
    expectFails(src, { tag: 'img', count: 1 });
    expectPasses(src, 'any strategy passes via grandparent style', { parentStrategy: 'any' });
  });

  it('sibling subtrees behave independently under any strategy', () => {
    const src = `<section>
  ${wrap('div', { className: 'h-20 w-20' }, img('/a.png'))}
  ${raw('span', img('/b.png'))}
</section>`;
    // nearest: a passes, b fails (no sized parent)
    expectFails(src, { contains: '/b.png', count: 1 });
    // any: a passes (sized parent), b still fails (no ancestor sized at all)
    expectFails(src, { contains: '/b.png', count: 1, scanOpts: { parentStrategy: 'any' } });
  });

  it('deeply nested sized component ancestor satisfies any strategy', () => {
    const src = raw('Card', { className: 'aspect-square' },
      raw('CardContent', { className: 'p-4' },
        raw('div', { className: 'm-2' }, img())
      )
    );
    expectFails(src, { tag: 'img', count: 1 });
    expectPasses(src, 'any strategy passes via Card ancestor', { parentStrategy: 'any' });
  });

  it('any strategy accepts arbitrary Tailwind on any ancestor', () => {
    const src = raw('section', { className: 'w-[calc(100vh-4rem)] h-[50%]' },
      raw('article',
        raw('div', img())
      )
    );
    expectFails(src, { tag: 'img', count: 1 });
    expectPasses(src, 'any strategy passes via section ancestor', { parentStrategy: 'any' });
  });
});

describe('check-media-dimensions: snapshot any-sized-ancestor resolution', () => {
  it('nearest parent is unsized but outer ancestor is sized — any strategy passes, snapshot still records nearest', () => {
    const src = wrap('section', { className: 'h-96 w-96' },
      raw('article', { className: 'p-4' },
        raw('div', { className: 'm-2' }, img('/deep.png'))
      )
    );
    // Under any strategy, the violation list is empty (passes).
    expect(shape(src, { parentStrategy: 'any' })).toEqual([]);
    // Under nearest strategy, snapshot captures the unsized nearest parent.
    expect(shape(src)).toMatchInlineSnapshot(`
      [
        {
          "line": 4,
          "nearestParent": {
            "className": "m-2",
            "style": "",
            "tag": "div",
          },
          "snippet": "<img src="/deep.png" />",
          "tag": "img",
        },
      ]
    `);
  });

  it('no sized ancestor under any strategy — snapshot identical to nearest strategy', () => {
    const src = raw('section',
      raw('article', { className: 'p-4' },
        raw('div', { className: 'm-2' }, img('/deep.png'))
      )
    );
    expect(shape(src, { parentStrategy: 'any' })).toMatchInlineSnapshot(`
      [
        {
          "line": 4,
          "nearestParent": {
            "className": "m-2",
            "style": "",
            "tag": "div",
          },
          "snippet": "<img src="/deep.png" />",
          "tag": "img",
        },
      ]
    `);
  });
});
