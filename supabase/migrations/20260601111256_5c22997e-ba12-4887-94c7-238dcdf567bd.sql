CREATE TABLE public.team_standings_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  division text NOT NULL,
  position integer,
  points integer NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_standings_history TO anon;
GRANT SELECT ON public.team_standings_history TO authenticated;
GRANT ALL ON public.team_standings_history TO service_role;

ALTER TABLE public.team_standings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings history is publicly viewable"
ON public.team_standings_history FOR SELECT
USING (true);

CREATE INDEX idx_tsh_team_captured ON public.team_standings_history(team_id, captured_at DESC);
CREATE INDEX idx_tsh_division_captured ON public.team_standings_history(division, captured_at DESC);