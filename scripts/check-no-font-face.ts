/**
 * CI lint: fail if any custom @font-face rule appears in source files.
 *
 * Why: this project intentionally loads all fonts via Google Fonts with
 * `display=swap` (see index.html). Custom @font-face rules bypass that
 * pipeline, ship un-subset font files, and risk FOIT / layout shift.
 *
 * Scans .css, .scss, .ts, .tsx, .js, .jsx, .html under the repo root
 * (excluding node_modules, dist, build, .git, coverage).
 *
 * Run via: bun run lint:fonts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const EXTS = /\.(css|scss|sass|less|ts|tsx|js|jsx|mjs|cjs|html)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.cache']);
// Allow this file (and the test file) to mention "@font-face" in comments/strings.
const SELF_FILES = new Set([
  'scripts/check-no-font-face.ts',
  'src/__tests__/no-font-face.test.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (EXTS.test(name)) out.push(p);
  }
  return out;
}

interface Hit {
  file: string;
  line: number;
  text: string;
}

const FONT_FACE_RE = /@font-face\b/i;

const files = walk(ROOT);
const hits: Hit[] = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  if (SELF_FILES.has(rel)) continue;
  const src = readFileSync(file, 'utf8');
  if (!FONT_FACE_RE.test(src)) continue;
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (FONT_FACE_RE.test(lines[i])) {
      hits.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 140) });
    }
  }
}

if (hits.length === 0) {
  console.log(`✓ no-font-face: ${files.length} files scanned, no custom @font-face rules found.`);
  process.exit(0);
}

console.error(`✗ no-font-face: ${hits.length} custom @font-face occurrence(s) detected:\n`);
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  ${h.text}`);
}
console.error(
  `\nFix: load fonts via the Google Fonts <link> in index.html (display=swap), or remove the rule. ` +
    `If you genuinely need a self-hosted font, add the file path to SELF_FILES in scripts/check-no-font-face.ts and document why.`,
);
process.exit(1);
