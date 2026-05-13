import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Visual regression guard: every <ImageWithSkeleton> usage must live inside a
 * parent element that (a) is `relative` (so the absolute Skeleton overlay
 * anchors correctly) and (b) reserves dimensions via h-/w- / size- / aspect-
 * utilities (so there is no layout shift while the image loads).
 *
 * Catches regressions where someone adds a new ImageWithSkeleton without the
 * required wrapper, or strips `relative` / sizing classes from an existing one.
 */

const FILES = [
  'src/pages/Teams.tsx',
  'src/pages/TeamDetail.tsx',
  'src/pages/admin/AdminTeams.tsx',
  'src/components/TeamEditDialog.tsx',
  'src/components/FlyerImporter.tsx',
];

const SIZING_RE = /\b(h-|w-|size-|aspect-|max-h-|min-h-)/;

function findParentClassName(src: string, idx: number): string | null {
  // Heuristic: scan up to ~20 lines back, collect every `className="..."` on
  // an opening tag, and return the nearest one preceding the match. JSX
  // wrappers around ImageWithSkeleton are always within this window.
  const start = Math.max(0, idx - 2000);
  const window = src.slice(start, idx);
  const re = /<\w[^<>]*?className\s*=\s*["'`]([^"'`]+)["'`][^<>]*?>/g;
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(window)) !== null) last = m[1];
  return last;
}

describe('ImageWithSkeleton wrapper contract', () => {
  for (const file of FILES) {
    it(`${file}: every <ImageWithSkeleton> has a relative + sized parent`, () => {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      const matches = [...src.matchAll(/<ImageWithSkeleton\b/g)];
      expect(matches.length).toBeGreaterThan(0);

      for (const m of matches) {
        const parentClass = findParentClassName(src, m.index!);
        expect(parentClass, `parent of ImageWithSkeleton in ${file}`).not.toBeNull();
        expect(parentClass!, `parent must include "relative" in ${file}`).toMatch(/\brelative\b/);
        expect(parentClass!, `parent must reserve dimensions in ${file}`).toMatch(SIZING_RE);
      }
    });
  }
});
