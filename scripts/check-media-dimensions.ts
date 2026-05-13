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
 *     - data-cls-exempt attribute
 *   …or on the nearest enclosing JSX wrapper element:
 *     - any of the above className utilities
 *     - inline style containing `aspectRatio`
 *   …or inline comment immediately before the tag:
 *     - JSX comment with "cls-exempt"
 *     - HTML comment with "cls-exempt"
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

function styleBlob(attrs: string): string {
  return [...attrs.matchAll(/style\s*=\s*(?:"([^"]*)"|'([^']*)'|\{(\{[^}]*\})\})/g)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? '')
    .join(' ');
}

function classHasSizing(blob: string): boolean {
  // Tailwind value: non-arbitrary (e.g. h-full, w-1/2, aspect-video) or arbitrary (e.g. h-[24rem], w-[calc(100vh-4rem)])
  const twValue = String.raw`(?:[\w./-]+|\[[^\]]*\])`;
  if (new RegExp(String.raw`\baspect-${twValue}`).test(blob)) return true;
  if (new RegExp(String.raw`\bsize-${twValue}`).test(blob)) return true;
  const hasH = new RegExp(String.raw`\b(?:h|min-h|max-h)-${twValue}`).test(blob);
  const hasW = new RegExp(String.raw`\b(?:w|min-w|max-w)-${twValue}`).test(blob);
  return hasH && hasW;
}

function hasDimensions(attrs: string): boolean {
  if (/\bwidth\s*=/.test(attrs) && /\bheight\s*=/.test(attrs)) return true;
  if (/aspectRatio\s*:/.test(styleBlob(attrs))) return true;
  return classHasSizing(classNameBlob(attrs));
}

/**
 * Build the JSX open-tag stack at every byte offset in `src`.
 * Returns the className and style blobs of the nearest enclosing JSX element opened
 * before offset i (or null if none / not yet sized-checkable).
 */
function parentAttrsAt(src: string, offset: number): { className: string | null; style: string | null } {
  const classStack: string[] = [];
  const styleStack: string[] = [];
  const tokenRe = /<(\/?)([A-Za-z][\w.-]*)([^<>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(src)) !== null) {
    if (m.index >= offset) break;
    const [, slash, , attrs, selfClose] = m;
    if (slash) {
      classStack.pop();
      styleStack.pop();
    } else if (!selfClose) {
      classStack.push(classNameBlob(attrs));
      styleStack.push(styleBlob(attrs));
    }
  }
  const i = classStack.length;
  return { className: i ? classStack[i - 1] : null, style: i ? styleStack[i - 1] : null };
}

/**
 * Look for an inline exemption comment immediately before a tag.
 * Supports JSX `{/\* cls-exempt *\ /}` and HTML `<!-- cls-exempt -->`.
 */
function isInlineExempt(src: string, tagIndex: number): boolean {
  const before = src.slice(0, tagIndex);
  // Match the last comment before this tag (JSX or HTML style)
  const m = before.match(/\{[/*\s]*cls-exempt[/*\s]*\}|<!--\s*cls-exempt\s*-->/g);
  if (!m) return false;
  // Ensure the comment is on the same or immediately preceding line
  const lastMatch = m[m.length - 1];
  const commentIdx = before.lastIndexOf(lastMatch);
  const textBetween = src.slice(commentIdx + lastMatch.length, tagIndex);
  return /^[\s\n]*$/.test(textBetween);
}

export function scanSource(src: string, file = '<inline>'): Violation[] {
  const violations: Violation[] = [];
  const tagRe = new RegExp(`<(${TAGS.join('|')})(\\s[^>]*?)?/?>`, 'gs');
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src)) !== null) {
    const [full, tag, attrsRaw] = m;
    const attrs = attrsRaw ?? '';
    if (/\bdata-cls-exempt\b/.test(attrs)) continue;
    if (isInlineExempt(src, m.index)) continue;
    if (hasDimensions(attrs)) continue;
    // Parent-wrapper allowance: accept if the nearest enclosing JSX element
    // reserves dimensions via className utilities or inline style aspectRatio.
    const parent = parentAttrsAt(src, m.index);
    if (parent.className && classHasSizing(parent.className)) continue;
    if (parent.style && /aspectRatio\s*:/.test(parent.style)) continue;
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

/**
 * Suggested-fix heuristic: looks at the offending tag's attributes to
 * recommend the lowest-friction remediation.
 */
export function suggestFix(v: Violation): string {
  const s = v.snippet;
  if (/<img\b/.test(s)) {
    return 'Wrap in a parent with `relative` + reserved dimensions (e.g. `<div className="relative aspect-video">…</div>`), use <ImageWithSkeleton>, or add explicit width/height attributes.';
  }
  if (/<iframe\b/.test(s) || /<embed\b/.test(s) || /<object\b/.test(s)) {
    return 'Add `className="aspect-video w-full"` (or another aspect-* utility) on the tag, or wrap in a sized parent.';
  }
  if (/<video\b/.test(s)) {
    return 'Add `width` + `height` attributes, or `className="aspect-video w-full"`, or wrap in a sized parent.';
  }
  return 'Add width+height, an aspect-* class, a size-* class, or wrap in a sized parent.';
}

export function toJsonReport(violations: Violation[]) {
  const byFile: Record<string, Array<Omit<Violation, 'file'> & { fix: string }>> = {};
  for (const v of violations) {
    (byFile[v.file] ??= []).push({ line: v.line, tag: v.tag, snippet: v.snippet, fix: suggestFix(v) });
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      totalViolations: violations.length,
      filesAffected: Object.keys(byFile).length,
    },
    files: Object.entries(byFile).map(([file, items]) => ({ file, count: items.length, items })),
  };
}

export function toMarkdownReport(violations: Violation[]): string {
  const json = toJsonReport(violations);
  const lines: string[] = [];
  lines.push('# Media Dimensions Report');
  lines.push('');
  lines.push(`_Generated ${json.generatedAt}_`);
  lines.push('');
  if (violations.length === 0) {
    lines.push('All media tags reserve dimensions. No CLS-prone elements found.');
    return lines.join('\n');
  }
  lines.push(
    `**${json.summary.totalViolations}** violation(s) across **${json.summary.filesAffected}** file(s).`,
  );
  lines.push('');
  lines.push('## Violations by file');
  lines.push('');
  for (const f of json.files) {
    lines.push(`### \`${f.file}\` (${f.count})`);
    lines.push('');
    lines.push('| Line | Tag | Snippet | Suggested fix |');
    lines.push('| ---: | --- | --- | --- |');
    for (const it of f.items) {
      const snip = it.snippet.replace(/\|/g, '\\|');
      const fix = it.fix.replace(/\|/g, '\\|');
      lines.push(`| ${it.line} | \`<${it.tag}>\` | \`${snip}\` | ${fix} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
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

function getArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function writeReport(path: string, contents: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
}

if (isMain) {
  const files = walk(ROOT).filter((f) => !EXEMPT.has(relative(process.cwd(), f)));
  const all = files.flatMap(scanFile);

  const jsonOut = getArg('json');
  const mdOut = getArg('md');
  const stdoutFormat = getArg('format'); // 'json' | 'md' (writes report to stdout)

  if (jsonOut) writeReport(jsonOut, JSON.stringify(toJsonReport(all), null, 2) + '\n');
  if (mdOut) writeReport(mdOut, toMarkdownReport(all) + '\n');

  if (stdoutFormat === 'json') {
    process.stdout.write(JSON.stringify(toJsonReport(all), null, 2) + '\n');
  } else if (stdoutFormat === 'md') {
    process.stdout.write(toMarkdownReport(all) + '\n');
  } else if (all.length === 0) {
    console.log(`✓ media-dimensions: ${files.length} files scanned, no CLS-prone <${TAGS.join('|')}> found.`);
  } else {
    console.error(`✗ media-dimensions: ${all.length} element(s) missing width/height/aspect-ratio:\n`);
    for (const v of all) {
      console.error(`  ${v.file}:${v.line}  <${v.tag}>  ${v.snippet}`);
      console.error(`      → ${suggestFix(v)}`);
    }
    console.error(
      `\nFix: add width+height attributes, a sized parent with h-*/w-* classes, an aspect-* class, style={{ aspectRatio: ... }}, or data-cls-exempt.\n` +
        `       To suppress a false positive inline, add data-cls-exempt or a {/* cls-exempt */} comment before the tag.`,
    );
    if (jsonOut) console.error(`\nJSON report written to ${jsonOut}`);
    if (mdOut) console.error(`Markdown report written to ${mdOut}`);
  }

  process.exit(all.length === 0 ? 0 : 1);
}
