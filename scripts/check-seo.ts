// SEO regression check: validates that public/sitemap.xml and public/robots.txt
// stay in sync with the routes declared in src/App.tsx.
//
// Fails (exit 1) only on TRUE regressions:
//   - sitemap.xml missing or not well-formed XML
//   - a public, indexable route exists in App.tsx but is not in the sitemap
//   - a route was removed from App.tsx but still appears in the sitemap (stale)
//   - robots.txt missing, or missing the `Sitemap:` directive
//   - robots.txt missing Disallow rules for /admin/ or /reset-password
//   - <loc> URLs use a host other than the configured BASE_URL
//
// Warnings (printed but non-fatal):
//   - dynamic routes (/teams/:id) only checked for the parent collection page
//
// Run locally: bun run lint:seo

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://findawalkon.com";
const SITEMAP_PATH = resolve("public/sitemap.xml");
const ROBOTS_PATH = resolve("public/robots.txt");
const APP_PATH = resolve("src/App.tsx");

const EXCLUDED_PATHS = new Set(["/reset-password", "/submissions"]);
function isExcluded(path: string): boolean {
  if (EXCLUDED_PATHS.has(path)) return true;
  if (path === "*") return true;
  if (path.startsWith("/admin")) return true;
  return false;
}

const errors: string[] = [];
const warnings: string[] = [];

// 1. Sitemap exists & is valid XML.
if (!existsSync(SITEMAP_PATH)) {
  errors.push(`public/sitemap.xml is missing — run \`bun run predev\` to generate it.`);
}
const sitemapXml = existsSync(SITEMAP_PATH) ? readFileSync(SITEMAP_PATH, "utf-8") : "";
if (sitemapXml && !sitemapXml.trimStart().startsWith("<?xml")) {
  errors.push(`sitemap.xml does not start with an XML declaration.`);
}
if (sitemapXml && !sitemapXml.includes("<urlset")) {
  errors.push(`sitemap.xml is missing the <urlset> root element.`);
}

// Extract <loc> URLs.
const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const sitemapPaths = new Set<string>();
for (const loc of locs) {
  if (!loc.startsWith(BASE_URL)) {
    errors.push(`sitemap <loc> uses unexpected host: ${loc} (expected ${BASE_URL})`);
    continue;
  }
  const path = loc.slice(BASE_URL.length) || "/";
  sitemapPaths.add(path);
}

// 2. Discover routes from App.tsx.
if (!existsSync(APP_PATH)) {
  errors.push(`src/App.tsx not found — cannot validate route coverage.`);
}
const appTsx = existsSync(APP_PATH) ? readFileSync(APP_PATH, "utf-8") : "";
const routePaths: string[] = [];
const routeRegex = /<Route\s+path=["']([^"']+)["']/g;
let m: RegExpExecArray | null;
while ((m = routeRegex.exec(appTsx)) !== null) {
  routePaths.push(m[1]);
}

const expectedStaticPaths = new Set(
  routePaths.filter((p) => !isExcluded(p) && !p.includes(":")),
);

// 3. Coverage: every expected static path is in sitemap.
for (const p of expectedStaticPaths) {
  if (!sitemapPaths.has(p)) {
    errors.push(`Route '${p}' is declared in App.tsx but missing from sitemap.xml.`);
  }
}

// 4. Stale: every static sitemap path corresponds to a real route or known dynamic
// collection (e.g. /teams/<uuid> from the /teams/:id route).
const dynamicParents = routePaths
  .filter((p) => p.includes(":"))
  .map((p) => p.replace(/\/:[^/]+.*$/, ""));
for (const p of sitemapPaths) {
  if (expectedStaticPaths.has(p)) continue;
  if (dynamicParents.some((parent) => parent && p.startsWith(parent + "/"))) continue;
  errors.push(`Sitemap contains '${p}' but no matching route exists in App.tsx (stale entry).`);
}

// Excluded paths must NOT be in sitemap.
for (const p of [...EXCLUDED_PATHS]) {
  if (sitemapPaths.has(p)) {
    errors.push(`Sitemap contains excluded path '${p}' — should not be indexed.`);
  }
}
for (const p of sitemapPaths) {
  if (p.startsWith("/admin")) {
    errors.push(`Sitemap contains admin path '${p}' — admin routes must not be indexed.`);
  }
}

// 5. robots.txt sanity.
if (!existsSync(ROBOTS_PATH)) {
  errors.push(`public/robots.txt is missing.`);
} else {
  const robots = readFileSync(ROBOTS_PATH, "utf-8");
  if (!/^Sitemap:\s*\S+/m.test(robots)) {
    errors.push(`robots.txt is missing the 'Sitemap:' directive.`);
  } else {
    const sitemapLine = robots.match(/^Sitemap:\s*(\S+)/m)?.[1];
    if (sitemapLine && !sitemapLine.startsWith(BASE_URL)) {
      errors.push(`robots.txt 'Sitemap:' points to '${sitemapLine}', expected to start with ${BASE_URL}.`);
    }
  }
  if (!/Disallow:\s*\/admin/i.test(robots)) {
    errors.push(`robots.txt is missing 'Disallow: /admin/' — admin pages could leak into search results.`);
  }
  if (!/Disallow:\s*\/reset-password/i.test(robots)) {
    errors.push(`robots.txt is missing 'Disallow: /reset-password'.`);
  }
}

// Report.
console.log(`SEO scan — ${BASE_URL}`);
console.log(`  Routes in App.tsx (indexable): ${expectedStaticPaths.size}`);
console.log(`  Entries in sitemap.xml:        ${sitemapPaths.size}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  • ${w}`);
}

if (errors.length) {
  console.error("\n❌ SEO regressions detected:");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log("\n✅ Sitemap and robots.txt are in sync with the app routes.");
