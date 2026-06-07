
-- Phase 1: Add beginner-friendly flag to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_beginner_friendly boolean NOT NULL DEFAULT false;

-- Phase 2: Player-seeking posts ("Looking for a game")
CREATE TABLE public.player_seeking_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  contact_email text NOT NULL,
  target_date date NOT NULL,
  region text,
  event_type event_type,
  notes text,
  expires_at date NOT NULL,
  delete_token uuid NOT NULL DEFAULT gen_random_uuid(),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.player_seeking_posts TO anon, authenticated;
GRANT ALL ON public.player_seeking_posts TO service_role;

ALTER TABLE public.player_seeking_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active posts publicly viewable"
  ON public.player_seeking_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    is_hidden = false
    AND expires_at >= current_date
    AND target_date >= current_date
  );

CREATE POLICY "Admins view all posts"
  ON public.player_seeking_posts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create post"
  ON public.player_seeking_posts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(player_name, '')) BETWEEN 1 AND 80
    AND char_length(coalesce(contact_email, '')) BETWEEN 3 AND 200
    AND char_length(coalesce(notes, '')) <= 500
    AND char_length(coalesce(region, '')) <= 80
    AND target_date >= current_date
    AND target_date <= (current_date + interval '180 days')::date
    AND expires_at >= current_date
    AND expires_at <= (current_date + interval '180 days')::date
    AND is_hidden = false
  );

CREATE POLICY "Admins manage posts"
  ON public.player_seeking_posts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Helper to delete via token (poster removal flow)
CREATE OR REPLACE FUNCTION public.delete_player_seeking_post(_id uuid, _token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.player_seeking_posts
  WHERE id = _id AND delete_token = _token
  RETURNING true;
$$;

-- Phase 3: Richer venue profiles
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS field_map_url text,
  ADD COLUMN IF NOT EXISTS hire_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS walk_on_rules text,
  ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS facilities text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS slug text;

-- Generate slug for existing venues (simple lowercase + hyphens)
UPDATE public.venues
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_unique ON public.venues (slug);

-- Allow admins to manage venues now that there's editable content
CREATE POLICY "Admins manage venues"
  ON public.venues
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.venues TO anon, authenticated;
GRANT ALL ON public.venues TO service_role;

-- Phase 4: Event recaps (photos/videos)
CREATE TABLE public.event_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_name text NOT NULL,
  uploader_email text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  caption text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  delete_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX event_recaps_event_id_idx ON public.event_recaps (event_id);
CREATE INDEX event_recaps_status_idx ON public.event_recaps (status);

GRANT SELECT, INSERT ON public.event_recaps TO anon, authenticated;
GRANT ALL ON public.event_recaps TO service_role;

ALTER TABLE public.event_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved recaps publicly viewable"
  ON public.event_recaps
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Admins view all recaps"
  ON public.event_recaps
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can submit recap"
  ON public.event_recaps
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND reviewed_at IS NULL
    AND char_length(coalesce(uploader_name, '')) BETWEEN 1 AND 80
    AND char_length(coalesce(uploader_email, '')) BETWEEN 3 AND 200
    AND char_length(coalesce(caption, '')) <= 300
    AND char_length(coalesce(media_url, '')) BETWEEN 8 AND 1000
  );

CREATE POLICY "Admins manage recaps"
  ON public.event_recaps
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
