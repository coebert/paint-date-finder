
-- Create enum for flag reasons
CREATE TYPE public.event_flag_reason AS ENUM (
  'wrong_date',
  'cancelled',
  'does_not_exist',
  'wrong_venue',
  'other'
);

-- Create event_flags table
CREATE TABLE public.event_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reason event_flag_reason NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.event_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can submit flags (no login required)
CREATE POLICY "Anyone can submit flags"
  ON public.event_flags
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    is_resolved = false
    AND resolved_at IS NULL
    AND char_length(COALESCE(details, '')) <= 500
  );

-- Admins can view and manage flags
CREATE POLICY "Admins can view flags"
  ON public.event_flags
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update flags"
  ON public.event_flags
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete flags"
  ON public.event_flags
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
