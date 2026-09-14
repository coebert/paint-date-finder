CREATE TABLE public.cpps_round_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season text NOT NULL DEFAULT '2026',
  round integer NOT NULL CHECK (round >= 1 AND round <= 30),
  division text NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name text NOT NULL,
  position integer CHECK (position IS NULL OR (position >= 1 AND position <= 200)),
  points integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX cpps_round_results_unique_team_round
  ON public.cpps_round_results (season, round, lower(team_name));
CREATE INDEX cpps_round_results_round_idx ON public.cpps_round_results (season, round);
CREATE INDEX cpps_round_results_team_idx ON public.cpps_round_results (team_id);

GRANT SELECT ON public.cpps_round_results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cpps_round_results TO authenticated;
GRANT ALL ON public.cpps_round_results TO service_role;

ALTER TABLE public.cpps_round_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Round results are viewable by everyone"
  ON public.cpps_round_results FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage round results"
  ON public.cpps_round_results FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cpps_round_results_updated_at
  BEFORE UPDATE ON public.cpps_round_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();