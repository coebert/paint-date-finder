
# Find A Walk-On — Design & UX review

I audited the home page on desktop (1280px) and mobile (440px), plus the calendar/list/map views, header, filters and hero. Below is what's working, what isn't, and a prioritised plan.

## What's working
- Strong brand direction: tactical dark theme + Bebas Neue display font gives the site a distinct identity vs generic SaaS.
- Semantic design tokens are in place (`--primary`, `--accent`, event-type colours).
- Solid information architecture: chips + dropdown filters + region shortcuts + calendar/list/map toggle.
- Good SEO/structural work (JSON-LD, region hub links, AI summary block).

## Problems observed

### Hero & background
- The forest hero image bleeds through the entire page (fixed, only a 35% dim). Body copy sits directly on high-contrast foliage — the tagline "Find paintball near you…" is barely legible against bright leaves. Fails AA in patches.
- No true "hero" — the page opens with a wall of controls (nav, chips, filters, near-me, calendar) with no headline moment, hierarchy or CTA above the fold.

### Header (desktop + mobile)
- On desktop the header is a single crowded row: logo + tagline + 3 view toggles + 3 nav buttons + 2 CTAs + admin link, all competing at equal weight.
- On mobile it collapses to a 9-button vertical stack ~800px tall before any content appears. There is no hamburger / drawer.
- View toggles (Calendar/List/Map), destination nav (Teams/Field Layout), and actions (Suggest/Import) are visually indistinguishable — they're all pill buttons.

### Filters
- Three stacked filter surfaces (event-type chips, "Filter Events" card, Near-Me card) do overlapping jobs. Event Type appears twice (chip row + dropdown).
- Filter card is heavy: giant "Filter Events" title, three full-width selects, always-on "Verified only" toggle, and a Clear button — takes ~200px before the calendar even starts.
- No active-filter summary/count; users can't tell what's applied at a glance.

### Calendar
- Empty weekdays are visually identical to populated ones — a lot of dark real estate.
- Event pills are truncated ("NXL British Invitational 2…") with no tooltip preview on hover.
- Today's cell uses only a thin orange ring; low salience.
- No week view / no agenda view for mobile — a 7-col grid on a 440px screen means each cell is ~55px wide and unreadable when populated.
- Legend sits below the calendar (out of sight on first load); category colours (7 similar saturations) are hard to distinguish.

### Typography & tokens
- Body font stack still declares `Inter` inline in `index.css` — fine, but headings use Bebas Neue at every size which makes h2/h3 feel shouty and lose hierarchy (all-caps, wide tracking, same weight).
- `text-muted-foreground` over the bright hero image drops below 3:1 contrast in places.
- `.calendar-day` uses `border-border/50` — very low contrast on the dark card.

### Ergonomics / touch
- On mobile many buttons are 36–40px tall (shadcn default). The pill nav row is fine, but chip filters and dropdown triggers feel cramped; some sit within 4px of each other.
- No sticky sub-nav — users scrolling the calendar lose access to view toggles/filters and must scroll back to the top.
- Splash screen is 657 lines and gated only by sessionStorage — good — but no "skip" affordance visible.

### Motion & polish
- Almost no motion tokens beyond `fade-in`/`slide-in` keyframes that aren't applied. Cards, chips, and filter changes snap.
- No skeleton for the calendar grid itself (only a single `Skeleton` block), producing a jarring pop-in.

### Accessibility
- Single `<main>` ✓, but hero heading is `h1` and inside `<main>` while the branded "Find A Walk-On" wordmark in the header reads as decorative — good.
- Icon-only "Admin Login" arrow, GPS button etc. need `aria-label` audit.
- Colour is the sole signifier for event type in the calendar pills.

---

## Improvement plan (phased, frontend-only)

### Phase 1 — Hero, header & above-the-fold hierarchy
1. **Real hero band**: give the top ~420px (desktop) / ~360px (mobile) a dedicated hero with:
   - Darker gradient scrim (`from-background via-background/85 to-background/40`) so body copy is always readable.
   - H1 + subtitle + single primary CTA ("Find events near me" → focuses Near-Me input) and a secondary "Browse calendar" link.
   - Move region chips and AI-summary block *below* the hero, not stacked before it.
2. **Restructure header** into three visual tiers:
   - Row 1 (sticky): logo + primary nav (Calendar/List/Map — segmented control) + Teams/Field Layout as text links + user menu.
   - Row 2 (mobile only): sheet/drawer for secondary actions (Suggest, Import, Admin).
   - Collapse "Import from Flyer" + "Suggest an Event" into one "+ Add event" split-button.
3. **Mobile nav**: hamburger → Sheet drawer for Teams / Field Layout / Looking for a Game / Admin. Keep view toggles as a segmented control just under the header.

### Phase 2 — Filters consolidation
4. Merge the three filter surfaces into one **filter bar**:
   - Left: event-type chips (single source of truth — remove the dropdown).
   - Right: `Region ▾`  `Venue ▾`  `Near me ▾` (opens a popover with GPS + postcode).
   - Below: an **active-filter row** with removable chips + "Clear all". Only rendered when filters ≠ default.
5. Make the filter bar **sticky** on scroll (with a subtle background blur), so it stays reachable while browsing the calendar/list.
6. Default `Verified only` to on but move it into a small overflow menu (`⋯`) alongside "Show cancelled", "Show past".

### Phase 3 — Calendar / list / map polish
7. **Calendar**:
   - Auto-switch to a mobile **agenda view** below `sm:` (grouped by date, tap-through to detail). Keep the grid for `md+`.
   - Highlight today with a solid accent dot + label rather than a full ring.
   - Fade weekend cells slightly; dim empty cells further so populated days pop.
   - Hover popover on event pills with title, time, venue, event-type icon.
   - Add an icon per event type (crosshair, flag, trophy…) so colour isn't the only signifier.
   - Skeleton grid that matches the real grid shape instead of a single 720px block.
8. **List view**: add sort control (date / distance / venue), a compact "density" toggle, and thumbnail previews from `image_url` where present.
9. **Map view**: add a legend panel that stays visible; cluster markers below `zoom < 8`; preserve last map centre in sessionStorage.

### Phase 4 — Typography, colour & motion
10. Introduce a **type scale** so headings aren't all Bebas Neue: keep Bebas for H1/H2 + display accents; use Inter (semibold) for H3–H6. Reduce H1 tracking from `0.05em` to `0.02em` for readability.
11. Add `--surface-1`, `--surface-2`, `--surface-3` tokens (elevated card, sunk card, overlay). Replace ad-hoc `bg-card/30`, `bg-secondary/40`, `bg-background/60` scattered across the page.
12. Tighten event-type palette: recompute the 8 hues so adjacent categories are ≥ 30° apart in HSL; also produce foreground pairs that pass AA on both light and dark chips.
13. Add motion tokens (`--ease-out-expo`, `--dur-fast/med/slow`) and apply to chip toggles, filter open, calendar day expand — 150–220ms, `will-change: transform, opacity`.
14. Global `focus-visible` ring using `--ring` (already defined) applied to all interactive elements.

### Phase 5 — Ergonomics & a11y sweep
15. Minimum tap target 44×44 for all header/nav/chip buttons on mobile (`min-h-11 min-w-11`).
16. Add `aria-label` audit for every icon-only button (GPS, admin arrow, close, chevron nav).
17. Replace `h-screen` usages with `h-dvh` (splash & dialogs) so mobile browser chrome doesn't clip.
18. Add a "Skip splash" link visible after 1s of the intro animation.
19. Persist last chosen view (Calendar/List/Map) in `localStorage` in addition to the URL param, so mobile users returning via home-screen shortcut land where they left off.

### Phase 6 — Nice-to-haves
20. Add an "Upcoming this weekend" strip above the calendar — 4–6 event cards, horizontal-scroll on mobile.
21. Empty-state art for "No events match your filters" with a one-click "Clear all filters".
22. Add a lightweight page-transition (fade + 4px translate) between Index / Teams / Region pages.
23. Consider a light theme toggle later — tokens are already themable; would broaden appeal.

## Technical notes
- All changes above are presentation-layer (components, `index.css`, `tailwind.config.ts`, hook-level UI state). No schema, RLS or edge-function changes.
- New surface/motion tokens go in `src/index.css` (@layer base) and are mirrored into `tailwind.config.ts`.
- Sticky filter bar + sheet drawer use existing shadcn primitives (`Sheet`, `Popover`, `ToggleGroup`) — no new deps.
- Calendar agenda view slots into `src/components/calendar/` alongside the existing cell/header modules from the recent refactor.

## Suggested execution order
Phase 1 → 2 → 3 gives the biggest perceived-quality lift and can each ship in one turn. Phases 4–6 are polish passes that can be interleaved.

Want me to start with **Phase 1 (hero + header restructure)**, or pick a different phase to lead with?
