DROP POLICY IF EXISTS "Roster is publicly viewable" ON public.team_roster;
CREATE POLICY "Roster of active teams is publicly viewable"
ON public.team_roster
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_roster.team_id AND t.is_active IS TRUE
));

DROP POLICY IF EXISTS "Standings history is publicly viewable" ON public.team_standings_history;
CREATE POLICY "Standings history of active teams is publicly viewable"
ON public.team_standings_history
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_standings_history.team_id AND t.is_active IS TRUE
));