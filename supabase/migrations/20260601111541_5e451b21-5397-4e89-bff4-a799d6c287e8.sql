ALTER TABLE public.team_standings_history
  ADD COLUMN season text NOT NULL DEFAULT to_char(now(), 'YYYY');

UPDATE public.team_standings_history
  SET season = to_char(captured_at, 'YYYY')
  WHERE season IS NULL OR season = '';

CREATE INDEX idx_tsh_team_season ON public.team_standings_history(team_id, season, captured_at);