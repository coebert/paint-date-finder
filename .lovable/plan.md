## Content & Discovery — Implementation Plan

Four features from the Content & Discovery section. Each is a meaningful chunk of work, so I'm grouping them into phases you can approve in one go.

---

### 1. Player-seeking posts ("Looking for a game")
A lightweight noticeboard where walk-on players post that they're looking for a game on a date/region, so teams and venues can fill spare slots.

- New table `player_seeking_posts` (player name, contact email, target date, region, optional event_type, notes, expires_at = date + 7 days, delete_token)
- Public read, anyone (anon) can insert with validation; auto-hide once expired or past date
- Admin moderation (delete/flag) via existing `has_role('admin')`
- New page `/looking-for-a-game` with:
  - List of active posts (filter by region + date range + event type)
  - "Post a request" dialog (name, email, date, region, event type, notes)
  - "Remove my post" link via delete_token (emailed-style flow — copy token shown on creation)
- Header nav entry + homepage CTA card

### 2. Event-type filters made prominent
Right now event-type filtering is buried. Surface it on the main events/calendar view.

- Add a horizontal **filter chip row** above the events list: All · Walk-on · Mag-Fed · Speedball · Scenario/Milsim · Beginner-friendly
- Chips use existing `event_type` enum + a derived "beginner-friendly" flag (events tagged via description keywords or new boolean — see technical notes)
- Persist selected filter in URL query (`?type=mag_fed`) so it's shareable and SEO-friendly
- Update the events hook to accept a type filter
- Mobile: horizontally scrollable chip strip

### 3. Richer venue profiles
Upgrade the existing venue detail experience.

- Extend `venues` table with: `field_map_url`, `hire_prices` (jsonb: { marker, paint_500, paint_1000, ... }), `walk_on_rules` (text), `gallery` (jsonb array of image URLs), `facilities` (text[] — parking, toilets, café, etc.)
- New `/venues/:slug` page (slug from name) showing: hero image, location + map, upcoming events at this venue, field map image, hire price table, walk-on rules, photo gallery, facilities
- Admin UI section to edit these fields (in existing admin area)
- Link venue names on event cards → venue profile

### 4. Recap photos/videos
After an event date passes, attendees can upload short clips/photos that attach to the event page.

- New table `event_recaps` (event_id, uploader_name, uploader_email, media_url, media_type 'image'|'video', caption, status 'pending'|'approved'|'rejected', delete_token)
- New storage bucket `event-recaps` (public read, authenticated/anon write via signed policy + size limits enforced in edge function)
- Edge function `upload-recap` to validate file size/type and create the row in `pending` status
- Approved recaps render on `/events/:id` as a gallery section below the event details
- Admin moderation queue alongside existing submissions/flags
- "Upload a recap" button appears on event page only after `event_date < today`

---

### Technical notes

- **Beginner-friendly flag**: add `is_beginner_friendly boolean` to `events` (admin-editable). Avoids fragile keyword matching.
- **Storage**: recap bucket public for read, uploads go through edge function with 25 MB image / 100 MB video cap, mime-type allowlist.
- **Validation**: reuse Zod patterns from `event_submissions`. Email + name length caps in RLS check constraints.
- **SEO**: venue profile pages get JSON-LD `Place` + `LocalBusiness`; recap gallery uses `ImageObject` / `VideoObject` schema on event pages.
- **British English / DD-MM-YYYY** preserved throughout.

---

### Order of execution
I'll ship in this order so each phase is usable independently:

1. Event-type filter chips (smallest, immediate UX win, no DB changes beyond optional `is_beginner_friendly`)
2. Player-seeking posts (new table + page)
3. Venue profiles (schema extension + new page + admin editor)
4. Recap uploads (storage + edge function + moderation)

Approve and I'll start with phase 1, then move through the rest in sequence.
