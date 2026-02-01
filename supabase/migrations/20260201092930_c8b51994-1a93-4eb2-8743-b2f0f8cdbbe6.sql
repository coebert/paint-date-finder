-- Create enum for submission status
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Create table for event submissions
CREATE TABLE public.event_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type public.event_type NOT NULL DEFAULT 'walk_on',
  venue_name TEXT NOT NULL,
  venue_location TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  booking_url TEXT,
  price_info TEXT,
  source_url TEXT,
  submitter_email TEXT NOT NULL,
  submitter_name TEXT,
  status public.submission_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit events
CREATE POLICY "Anyone can submit events"
ON public.event_submissions
FOR INSERT
WITH CHECK (true);

-- Anyone can view approved submissions (for transparency)
CREATE POLICY "Anyone can view approved submissions"
ON public.event_submissions
FOR SELECT
USING (status = 'approved');

-- For now, allow anyone to update/manage submissions (later can add admin auth)
CREATE POLICY "Anyone can update submissions"
ON public.event_submissions
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete submissions"
ON public.event_submissions
FOR DELETE
USING (true);