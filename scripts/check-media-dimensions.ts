/**
 * CI lint: scan src/ for <img>, <iframe>, <embed>, <video>, <object> JSX
 * elements that don't reserve space, which would cause layout shift (CLS).
 *
 * An element passes if ANY of these are present on the tag:
 *   - explicit width AND height attributes
 *   - a className containing both an h-* and a w-* utility
 *   - a className containing aspect-* (e.g. aspect-video, aspect-square)
 *   - a className containing size-* (Tailwind shorthand for w+h)
 *   - a style containing aspectRatio
 *
 * Run via: bun run lint:media
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const TAGS = ['img', 'iframe', 'embed', 'video', 'object'];

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

function hasDimensions(attrs: string): boolean {
  // explicit width + height attributes
  if (/\bwidth\s*=/.test(attrs) && /\bheight\s*=/.test(attrs)) return true;
  // aspect-ratio inline style
  if (/aspectRatio\s*:/.test(attrs)) return true;
  // className utilities — pull every className="..." or className={`...`}
  const classBlobs = [...attrs.matchAll(/className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{"([^"]*)"\}|\{'([^']*)'\})/g)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '')
    .join(' ');
  if (/\baspect-[\w./-]+/.test(classBlobs)) return true;
  if (/\bsize-[\w./-]+/.test(classBlobs)) return true;
  const hasH = /\bh-[\w./[\]-]+/.test(classBlobs);
  const hasW = /\bw-[\w./[\]-]+/.test(classBlobs);
  if (hasH && hasW) return true;
  return false;
}

function scanFile(file: string): Violation[] {
  const src = readFileSync(file, 'utf8');
  const violations: Violation[] = [];
  const tagRe = new RegExp(`<(${TAGS.join('|')})(\\s[^>]*?)?/?>`, 'gs');
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src)) !== null) {
    const [full, tag, attrsRaw] = m;
    const attrs = attrsRaw ?? '';
    // parent wrapper allowance: inspect attrs only — we deliberately keep
    // this strict. Authors should put dimensions on the tag itself OR use a
    // sized parent + className h-*/w-*/aspect-*/size-* on the element.
    if (hasDimensions(attrs)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    violations.push({
      file: relative(process.cwd(), file),
      line,
      tag,
      snippet: full.replace(/\s+/g, ' ').slice(0, 120),
    });
  }
  return violations;
}

const files = walk(ROOT);
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
