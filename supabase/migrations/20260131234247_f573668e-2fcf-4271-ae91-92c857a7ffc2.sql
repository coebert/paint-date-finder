-- Create enum for event types
CREATE TYPE event_type AS ENUM ('walk_on', 'big_game', 'competition', 'tournament', 'speedball', 'scenario', 'other');

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL DEFAULT 'walk_on',
  venue_name TEXT NOT NULL,
  venue_location TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  booking_url TEXT,
  image_url TEXT,
  price_info TEXT,
  is_verified BOOLEAN DEFAULT false,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read access (events are public info)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public can view all events
CREATE POLICY "Events are publicly viewable" 
ON public.events 
FOR SELECT 
USING (true);

-- Create venues table for grouping
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are publicly viewable" 
ON public.venues 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for events
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient date queries
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_venue ON public.events(venue_name);