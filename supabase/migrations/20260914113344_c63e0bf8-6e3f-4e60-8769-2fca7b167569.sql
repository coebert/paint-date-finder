CREATE OR REPLACE FUNCTION public.snapshot_cpps_standings_on_round()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _season text;
BEGIN
  -- Only CPPS round events trigger a snapshot.
  IF NEW.title !~* '\ycpps\y' OR NEW.title !~* '\yround\s*[0-9]+\y' THEN
    RETURN NEW;
  END IF;

  _season := to_char(NEW.event_date, 'YYYY');

  -- One snapshot per season per day, however many round days get added.
  IF EXISTS (
    SELECT 1 FROM public.team_standings_history
    WHERE season = _season AND captured_at >= date_trunc('day', now())
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.team_standings_history (team_id, division, position, points, season)
  SELECT t.id, t.division, t.position, COALESCE(t.points, 0), _season
  FROM public.teams t
  WHERE t.league = 'CPPS' AND COALESCE(t.is_active, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_cpps_standings ON public.events;

CREATE TRIGGER trg_snapshot_cpps_standings
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_cpps_standings_on_round();