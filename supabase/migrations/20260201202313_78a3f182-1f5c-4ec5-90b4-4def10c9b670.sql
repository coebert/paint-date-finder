-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles: only admins can view roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy for user_roles: only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- FIX EVENTS TABLE RLS POLICIES
-- =============================================

-- Drop the insecure permissive policies
DROP POLICY IF EXISTS "Anyone can insert events" ON events;
DROP POLICY IF EXISTS "Anyone can update events" ON events;
DROP POLICY IF EXISTS "Anyone can delete events" ON events;

-- Create admin-only policies for events
CREATE POLICY "Admins can insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events"
ON events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
ON events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- FIX EVENT_SUBMISSIONS TABLE RLS POLICIES
-- =============================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Anyone can view all submissions" ON event_submissions;
DROP POLICY IF EXISTS "Anyone can update submissions" ON event_submissions;
DROP POLICY IF EXISTS "Anyone can delete submissions" ON event_submissions;

-- Keep INSERT policy - anyone can submit events (public form)
-- "Anyone can submit events" policy stays

-- Only admins can view submissions (protects email addresses)
CREATE POLICY "Admins can view submissions"
ON event_submissions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update submissions (for moderation)
CREATE POLICY "Admins can update submissions"
ON event_submissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete submissions
CREATE POLICY "Admins can delete submissions"
ON event_submissions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- ADD URL VALIDATION CONSTRAINTS
-- =============================================

-- Add check constraints to ensure only http/https URLs
ALTER TABLE events ADD CONSTRAINT events_valid_booking_url 
CHECK (booking_url IS NULL OR booking_url ~ '^https?://');

ALTER TABLE events ADD CONSTRAINT events_valid_source_url 
CHECK (source_url IS NULL OR source_url ~ '^https?://');

ALTER TABLE events ADD CONSTRAINT events_valid_image_url 
CHECK (image_url IS NULL OR image_url ~ '^https?://');

ALTER TABLE event_submissions ADD CONSTRAINT submissions_valid_booking_url
CHECK (booking_url IS NULL OR booking_url ~ '^https?://');

ALTER TABLE event_submissions ADD CONSTRAINT submissions_valid_source_url
CHECK (source_url IS NULL OR source_url ~ '^https?://');

ALTER TABLE venues ADD CONSTRAINT venues_valid_website
CHECK (website IS NULL OR website ~ '^https?://');