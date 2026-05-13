/**
 * CI lint: scan src/ for <img>, <iframe>, <embed>, <video>, <object> JSX
 * elements that don't reserve space, which would cause layout shift (CLS).
 *
 * An element passes if ANY of these are present:
 *   On the tag itself:
 *     - explicit width AND height attributes
 *     - className with both an h-* (or min-h-/max-h-) AND w-* (or min-w-/max-w-) utility
 *     - className with aspect-* (e.g. aspect-video, aspect-square)
 *     - className with size-* (Tailwind shorthand for w+h)
 *     - style containing aspectRatio
 *   …or on the nearest enclosing JSX wrapper element:
 *     - any of the above className utilities
 *
 * Run via: bun run lint:media
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const TAGS = ['img', 'iframe', 'embed', 'video', 'object'];
// Files exempt from the check — these own the dimension contract themselves
// (e.g. wrapper components that require a sized parent by API).
const EXEMPT = new Set<string>(['src/components/ImageWithSkeleton.tsx']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

interface Violation {
  file: string;
  line: number;
  tag: string;
  snippet: string;
}

export function classNameBlob(attrs: string): string {
  return [...attrs.matchAll(/className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{"([^"]*)"\}|\{'([^']*)'\})/g)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '')
    .join(' ');
}

function classHasSizing(blob: string): boolean {
  if (/\baspect-[\w./-]+/.test(blob)) return true;
  if (/\bsize-[\w./-]+/.test(blob)) return true;
  const hasH = /\b(?:h|min-h|max-h)-[\w./[\]-]+/.test(blob);
  const hasW = /\b(?:w|min-w|max-w)-[\w./[\]-]+/.test(blob);
  return hasH && hasW;
}

function hasDimensions(attrs: string): boolean {
  if (/\bwidth\s*=/.test(attrs) && /\bheight\s*=/.test(attrs)) return true;
  if (/aspectRatio\s*:/.test(attrs)) return true;
  return classHasSizing(classNameBlob(attrs));
}

/**
 * Build the JSX open-tag stack at every byte offset in `src`.
 * Returns parents[i] = className of nearest enclosing JSX element opened
 * before offset i (or null if none / not yet sized-checkable).
 */
function parentClassNameAt(src: string, offset: number): string | null {
  const stack: string[] = []; // className blobs of currently-open ancestors
  const tokenRe = /<(\/?)([A-Za-z][\w.-]*)([^<>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(src)) !== null) {
    if (m.index >= offset) break;
    const [, slash, , attrs, selfClose] = m;
    if (slash) {
      stack.pop();
    } else if (!selfClose) {
      stack.push(classNameBlob(attrs));
    }
  }
  return stack.length ? stack[stack.length - 1] : null;
}

export function scanSource(src: string, file = '<inline>'): Violation[] {
  const violations: Violation[] = [];
  const tagRe = new RegExp(`<(${TAGS.join('|')})(\\s[^>]*?)?/?>`, 'gs');
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src)) !== null) {
    const [full, tag, attrsRaw] = m;
    const attrs = attrsRaw ?? '';
    if (hasDimensions(attrs)) continue;
    // Parent-wrapper allowance: accept if the nearest enclosing JSX element
    // reserves dimensions via className utilities.
    const parentClass = parentClassNameAt(src, m.index);
    if (parentClass && classHasSizing(parentClass)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    violations.push({
      file,
      line,
      tag,
      snippet: full.replace(/\s+/g, ' ').slice(0, 120),
    });
  }
  return violations;
}

function scanFile(file: string): Violation[] {
  return scanSource(readFileSync(file, 'utf8'), relative(process.cwd(), file));
}

// Only run as a CLI when executed directly (not when imported by tests).
const isMain = (() => {
  try {
    const argv1 = process.argv[1] ?? '';
    return argv1.includes('check-media-dimensions');
  } catch {
    return false;
  }
})();

if (isMain) {
  const files = walk(ROOT).filter((f) => !EXEMPT.has(relative(process.cwd(), f)));
  const all = files.flatMap(scanFile);

  if (all.length === 0) {
    console.log(`✓ media-dimensions: ${files.length} files scanned, no CLS-prone <${TAGS.join('|')}> found.`);
    process.exit(0);
  }

  console.error(`✗ media-dimensions: ${all.length} element(s) missing width/height/aspect-ratio:\n`);
  for (const v of all) {
    console.error(`  ${v.file}:${v.line}  <${v.tag}>  ${v.snippet}`);
  }
  console.error(
    `\nFix: add width+height attributes, a sized parent with h-*/w-* classes on the element, an aspect-* class, or style={{ aspectRatio: ... }}.`,
  );
  process.exit(1);
}
