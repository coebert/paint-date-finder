
CREATE TABLE public.team_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_number text,
  role text,
  is_captain boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roster is publicly viewable" ON public.team_roster FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage roster" ON public.team_roster FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
