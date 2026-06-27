// Region content audit — detects thin or duplicate region landing pages
// and produces actionable suggestions for improving indexing likelihood.

import { supabase } from "@/integrations/supabase/client";
import { ALL_REGIONS, type RegionMeta } from "@/lib/regions";

export type AuditSeverity = "ok" | "warn" | "fail";

export interface AuditIssue {
  severity: AuditSeverity;
  code:
    | "thin_intro"
    | "few_venues"
    | "no_venues"
    | "few_upcoming_events"
    | "low_word_count"
    | "duplicate_intro"
    | "overlapping_cities"
    | "few_cities";
  message: string;
  suggestion: string;
}

export interface RegionAuditRow {
  region: RegionMeta;
  url: string;
  venueCount: number;
  upcomingCount: number;
  introWords: number;
  totalWords: number;
  worstSeverity: AuditSeverity;
  issues: AuditIssue[];
  duplicatePartners: string[]; // region names with high intro similarity
  cityOverlapPartners: { region: string; cities: string[] }[];
}

export interface RegionAuditReport {
  generatedAt: string;
  rows: RegionAuditRow[];
  summary: { ok: number; warn: number; fail: number };
}

const SITE = "https://findawalkon.com";

// Thresholds
const THIN_INTRO_WORDS = 25;
const LOW_TOTAL_WORDS = 120;
const FEW_VENUES = 3;
const FEW_UPCOMING = 2;
const FEW_CITIES = 3;
const DUPLICATE_JACCARD = 0.55;
const CITY_OVERLAP_MIN = 2;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  setA.forEach((t) => {
    if (setB.has(t)) inter++;
  });
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function worstOf(issues: AuditIssue[]): AuditSeverity {
  if (issues.some((i) => i.severity === "fail")) return "fail";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "ok";
}

export async function runRegionAudit(): Promise<RegionAuditReport> {
  // Pull all venues grouped by region in a single query.
  const { data: venues, error: vErr } = await supabase
    .from("venues")
    .select("id, name, region")
    .not("region", "is", null);
  if (vErr) throw vErr;

  const venuesByRegion = new Map<string, { id: string; name: string }[]>();
  for (const v of venues ?? []) {
    const r = v.region as string;
    if (!venuesByRegion.has(r)) venuesByRegion.set(r, []);
    venuesByRegion.get(r)!.push({ id: v.id as string, name: v.name as string });
  }

  // Upcoming verified events for each region's venues
  const today = new Date().toISOString().slice(0, 10);
  const { data: events, error: eErr } = await supabase
    .from("events")
    .select("venue, event_date, is_verified")
    .gte("event_date", today)
    .eq("is_verified", true);
  if (eErr) throw eErr;

  const upcomingByVenue = new Map<string, number>();
  for (const e of events ?? []) {
    const v = e.venue as string;
    upcomingByVenue.set(v, (upcomingByVenue.get(v) ?? 0) + 1);
  }

  // Pre-tokenize intros for similarity comparison
  const tokens = new Map<string, string[]>();
  ALL_REGIONS.forEach((r) => tokens.set(r.slug, tokenize(r.intro)));

  const rows: RegionAuditRow[] = ALL_REGIONS.map((region) => {
    const venueRows = venuesByRegion.get(region.name) ?? [];
    const venueCount = venueRows.length;
    const upcomingCount = venueRows.reduce(
      (sum, v) => sum + (upcomingByVenue.get(v.name) ?? 0),
      0,
    );
    const introWords = tokenize(region.intro).length;
    const cityWords = region.cities.join(" ").split(/\s+/).length;
    const venueWords = venueRows.reduce((s, v) => s + v.name.split(/\s+/).length, 0);
    const totalWords = introWords + cityWords + venueWords;

    const issues: AuditIssue[] = [];

    if (introWords < THIN_INTRO_WORDS) {
      issues.push({
        severity: "warn",
        code: "thin_intro",
        message: `Intro is only ${introWords} words (target ≥${THIN_INTRO_WORDS}).`,
        suggestion:
          "Expand the intro with a sentence about local scene specifics, popular formats, or travel notes.",
      });
    }

    if (venueCount === 0) {
      issues.push({
        severity: "fail",
        code: "no_venues",
        message: "No verified venues attached to this region.",
        suggestion:
          "Add at least one verified venue with region set, or this page is effectively empty to Google.",
      });
    } else if (venueCount < FEW_VENUES) {
      issues.push({
        severity: "warn",
        code: "few_venues",
        message: `Only ${venueCount} venue${venueCount === 1 ? "" : "s"} listed.`,
        suggestion:
          "Add more verified venues or merge with a neighbouring region until coverage grows.",
      });
    }

    if (upcomingCount < FEW_UPCOMING) {
      issues.push({
        severity: "warn",
        code: "few_upcoming_events",
        message: `Only ${upcomingCount} upcoming verified event${upcomingCount === 1 ? "" : "s"}.`,
        suggestion:
          "Encourage local venues to submit walk-on dates so the page has fresh, indexable content.",
      });
    }

    if (totalWords < LOW_TOTAL_WORDS) {
      issues.push({
        severity: "warn",
        code: "low_word_count",
        message: `Total visible content ~${totalWords} words — likely thin.`,
        suggestion:
          "Add a short FAQ block (cost, age limits, formats) or local-area copy to push past ~250 words.",
      });
    }

    if (region.cities.length < FEW_CITIES) {
      issues.push({
        severity: "warn",
        code: "few_cities",
        message: `Only ${region.cities.length} cities/areas listed.`,
        suggestion: "Add 2–3 more city/area chips in src/lib/regions.ts to widen keyword coverage.",
      });
    }

    return {
      region,
      url: `${SITE}/paintball/${region.slug}`,
      venueCount,
      upcomingCount,
      introWords,
      totalWords,
      worstSeverity: "ok" as AuditSeverity,
      issues,
      duplicatePartners: [],
      cityOverlapPartners: [],
    };
  });

  // Duplicate intro + city overlap detection (pairwise)
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const sim = jaccard(tokens.get(a.region.slug)!, tokens.get(b.region.slug)!);
      if (sim >= DUPLICATE_JACCARD) {
        a.duplicatePartners.push(b.region.name);
        b.duplicatePartners.push(a.region.name);
      }
      const overlap = a.region.cities.filter((c) => b.region.cities.includes(c));
      if (overlap.length >= CITY_OVERLAP_MIN) {
        a.cityOverlapPartners.push({ region: b.region.name, cities: overlap });
        b.cityOverlapPartners.push({ region: a.region.name, cities: overlap });
      }
    }
  }

  for (const row of rows) {
    if (row.duplicatePartners.length > 0) {
      row.issues.push({
        severity: "fail",
        code: "duplicate_intro",
        message: `Intro highly similar to: ${row.duplicatePartners.join(", ")}.`,
        suggestion:
          "Rewrite this region's intro with location-specific phrasing (notable fields, terrain, scene history) so Google doesn't fold it into a duplicate cluster.",
      });
    }
    if (row.cityOverlapPartners.length > 0) {
      row.issues.push({
        severity: "warn",
        code: "overlapping_cities",
        message: `City list overlaps with: ${row.cityOverlapPartners
          .map((p) => `${p.region} (${p.cities.join(", ")})`)
          .join("; ")}.`,
        suggestion:
          "Move shared cities to whichever region they geographically belong to, so each page owns its keyword set.",
      });
    }
    row.worstSeverity = worstOf(row.issues);
  }

  const summary = rows.reduce(
    (acc, r) => {
      acc[r.worstSeverity]++;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0 },
  );

  return { generatedAt: new Date().toISOString(), rows, summary };
}
