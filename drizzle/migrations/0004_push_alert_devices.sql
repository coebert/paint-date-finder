CREATE TABLE public.alert_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'ios',
  latitude double precision,
  longitude double precision,
  radius_miles integer NOT NULL DEFAULT 50 CHECK (radius_miles BETWEEN 5 AND 500),
  walk_ons boolean NOT NULL DEFAULT true,
  cpps boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.alert_devices TO service_role;
ALTER TABLE public.alert_devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.event_alerts_sent (
  event_id uuid PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipients integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.event_alerts_sent TO service_role;
ALTER TABLE public.event_alerts_sent ENABLE ROW LEVEL SECURITY;