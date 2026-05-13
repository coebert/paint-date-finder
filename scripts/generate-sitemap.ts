// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
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

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/teams", changefreq: "weekly", priority: "0.8" },
  { path: "/field-layout", changefreq: "monthly", priority: "0.6" },
];

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
  const teams = await fetchTeams();
  const entries = [...staticEntries, ...teams];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
})();
