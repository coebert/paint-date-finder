
CREATE TABLE public.field_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  author_name text,
  tags text[] DEFAULT '{}',
  obstacles jsonb NOT NULL,
  obstacle_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.field_layouts ENABLE ROW LEVEL SECURITY;

-- Anyone can view layouts
CREATE POLICY "Layouts are publicly viewable"
  ON public.field_layouts FOR SELECT
  TO public
  USING (true);

-- Anyone can insert layouts (fully public)
CREATE POLICY "Anyone can create layouts"
  ON public.field_layouts FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can update/delete
CREATE POLICY "Admins can update layouts"
  ON public.field_layouts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete layouts"
  ON public.field_layouts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
