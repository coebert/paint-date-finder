// event-og-image — renders a 1200×630 PNG Open Graph card for an event.
//
//   GET /event-og-image?id=<uuid>
//
// Returns a branded social card (title, date, venue, type) on the Find A
// Walk-On dark/olive palette. Cached for 24h on the CDN edge and 7d in
// shared caches so Twitter/Facebook/LinkedIn crawlers don't hammer it.
//
// Public — no JWT required (see config.toml: verify_jwt = false). We only
// read non-sensitive event metadata via the service-role client.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  walk_on: "Walk-On",
  mag_fed: "Mag-Fed",
  scenario: "Scenario",
  tournament: "Tournament",
  big_game: "Big Game",
  training: "Training",
  beginner: "Beginner",
  woodsball: "Woodsball",
  speedball: "Speedball",
  other: "Event",
};

function eventTypeLabel(t: string | null | undefined): string {
  if (!t) return "Walk-On";
  return EVENT_TYPE_LABELS[t] ?? t.replace(/_/g, " ");
}

function formatUkDate(iso: string): string {
  // event_date is YYYY-MM-DD; build a UTC date to avoid TZ drift.
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fallbackImage(message: string, status: number): Response {
  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1410",
          color: "#e7e5d9",
          fontSize: 48,
          fontFamily: "sans-serif",
        },
        children: message,
      },
    } as any,
    {
      width: 1200,
      height: 630,
      status,
      headers: {
        ...corsHeaders,
        "cache-control": "public, max-age=300",
      },
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fallbackImage("Find A Walk-On", 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, title, venue_name, venue_location, event_date, event_type, is_beginner_friendly",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !event) {
    return fallbackImage("Event not found", 404);
  }

  const dateStr = formatUkDate(event.event_date);
  const typeLabel = eventTypeLabel(event.event_type);
  const title = (event.title ?? "Paintball walk-on").slice(0, 120);
  const venueLine = [event.venue_name, event.venue_location]
    .filter(Boolean)
    .join(" · ");

  // Olive / orange tactical palette mirrors the in-app design system.
  const OLIVE = "#3a4a2a";
  const ORANGE = "#d97a2c";
  const PARCHMENT = "#e7e5d9";
  const MUTED = "#a8a89a";
  const BG_DEEP = "#0d110b";

  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: PARCHMENT,
          background:
            `radial-gradient(circle at 20% 0%, ${OLIVE} 0%, ${BG_DEEP} 60%)`,
          fontFamily: "sans-serif",
        },
        children: [
          // Header row — brand + type chip
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontSize: 28,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: PARCHMENT,
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            background: ORANGE,
                            display: "flex",
                          },
                          children: "",
                        },
                      },
                      "Find A Walk-On",
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      padding: "10px 22px",
                      borderRadius: 999,
                      border: `2px solid ${ORANGE}`,
                      color: ORANGE,
                      fontSize: 26,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      display: "flex",
                    },
                    children: typeLabel,
                  },
                },
              ],
            },
          },
          // Title + meta block
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 22,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 78,
                      fontWeight: 800,
                      lineHeight: 1.05,
                      color: PARCHMENT,
                      display: "flex",
                      // Clamp to ~3 lines visually via maxHeight.
                      maxHeight: 270,
                      overflow: "hidden",
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 36,
                      color: ORANGE,
                      fontWeight: 600,
                      display: "flex",
                    },
                    children: dateStr,
                  },
                },
                venueLine
                  ? {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 32,
                          color: PARCHMENT,
                          display: "flex",
                          maxWidth: 1050,
                          overflow: "hidden",
                        },
                        children: venueLine,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // Footer — URL + beginner badge
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                borderTop: `1px solid ${OLIVE}`,
                paddingTop: 24,
                fontSize: 26,
                color: MUTED,
                letterSpacing: 1,
              },
              children: [
                "findawalkon.com",
                event.is_beginner_friendly
                  ? {
                      type: "div",
                      props: {
                        style: {
                          padding: "8px 18px",
                          borderRadius: 6,
                          background: OLIVE,
                          color: PARCHMENT,
                          fontSize: 24,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          display: "flex",
                        },
                        children: "Beginner-friendly",
                      },
                    }
                  : "UK paintball walk-on events",
              ],
            },
          },
        ],
      },
    } as any,
    {
      width: 1200,
      height: 630,
      headers: {
        ...corsHeaders,
        // 1 day on the edge, 7 days for shared caches; crawlers re-fetch
        // when these expire so updates propagate naturally.
        "cache-control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "content-type": "image/png",
      },
    },
  );
});
