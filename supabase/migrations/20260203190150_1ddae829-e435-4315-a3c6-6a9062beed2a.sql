-- Create a table to track user visits/page views
CREATE TABLE public.user_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  page_path TEXT
);

-- Enable RLS
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visits (for anonymous tracking)
CREATE POLICY "Anyone can insert visits"
ON public.user_visits
FOR INSERT
WITH CHECK (true);

-- Only admins can view visits
CREATE POLICY "Admins can view visits"
ON public.user_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for efficient querying by date
CREATE INDEX idx_user_visits_visited_at ON public.user_visits(visited_at DESC);

-- Create a function to get visit stats by period
CREATE OR REPLACE FUNCTION public.get_visit_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  visit_date DATE,
  unique_visitors BIGINT,
  total_visits BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(visited_at) as visit_date,
    COUNT(DISTINCT COALESCE(user_id::text, session_id)) as unique_visitors,
    COUNT(*) as total_visits
  FROM public.user_visits
  WHERE visited_at >= NOW() - (days_back || ' days')::interval
  GROUP BY DATE(visited_at)
  ORDER BY visit_date ASC
$$;