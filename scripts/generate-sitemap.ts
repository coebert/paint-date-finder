// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Discovers routes from src/App.tsx automatically, excludes /reset-password and /admin/*,
// and expands dynamic params by fetching from Supabase.

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://findawalkon.com";
const SUPABASE_URL = "https://jsibyruejumcpldutyqg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWJ5cnVlanVtY3BsZHV0eXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzYxMjksImV4cCI6MjA4NTQ1MjEyOX0.H4HKzKQuWePZRG6mSCp3rN-vQdMq7PkD9U-28GIdheE";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const EXCLUDED_PATHS = new Set(["/reset-password", "/submissions"]);

function isExcluded(path: string): boolean {
  if (EXCLUDED_PATHS.has(path)) return true;
  if (path === "*") return true;
  if (path.startsWith("/admin")) return true;
  return false;
}

// Discover static routes from src/App.tsx by matching <Route path="..." />
function discoverStaticRoutes(): string[] {
  const appTsx = readFileSync(resolve("src/App.tsx"), "utf-8");
  const paths: string[] = [];
  const regex = /<Route\s+path=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(appTsx)) !== null) {
    const p = match[1];
    if (isExcluded(p)) continue;
    if (p.includes(":")) continue; // skip dynamic params (expanded separately)
    paths.push(p);
  }
  return [...new Set(paths)];
}

async function fetchTeams(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/teams?select=id,updated_at`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn(`sitemap: failed to fetch teams (${res.status})`);
      return [];
    }
    const rows: Array<{ id: string; updated_at?: string }> = await res.json();
    return rows.map((t) => ({
      path: `/teams/${t.id}`,
      lastmod: t.updated_at ? t.updated_at.split("T")[0] : undefined,
      changefreq: "weekly",
      priority: "0.6",
    }));
  } catch (e) {
    console.warn("sitemap: error fetching teams", e);
    return [];
  }
}

async function fetchEvents(): Promise<SitemapEntry[]> {
  try {
    // Only include events from today onwards to keep the sitemap focused on indexable upcoming pages.
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=id,updated_at,event_date&event_date=gte.${today}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) {
      console.warn(`sitemap: failed to fetch events (${res.status})`);
      return [];
    }
    const rows: Array<{ id: string; updated_at?: string }> = await res.json();
    return rows.map((e) => ({
      path: `/events/${e.id}`,
      lastmod: e.updated_at ? e.updated_at.split("T")[0] : undefined,
      changefreq: "weekly",
      priority: "0.7",
    }));
  } catch (e) {
    console.warn("sitemap: error fetching events", e);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const staticPaths = discoverStaticRoutes();
  const staticEntries: SitemapEntry[] = staticPaths.map((p) => {
    if (p === "/") return { path: p, changefreq: "daily", priority: "1.0" };
    return { path: p, changefreq: "weekly", priority: "0.8" };
  });

  const teams = await fetchTeams();
  const events = await fetchEvents();
  const entries = [...staticEntries, ...teams, ...events];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
})();
