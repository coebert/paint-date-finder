ALTER TABLE public.event_flags
  ADD COLUMN IF NOT EXISTS suggested_date date;

CREATE OR REPLACE FUNCTION public.create_event_flag(
  _event_id uuid,
  _reason event_flag_reason,
  _details text,
  _suggested_date date DEFAULT NULL
)
RETURNS TABLE(id uuid, delete_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  new_token uuid;
  effective_suggested date;
BEGIN
  IF _details IS NOT NULL AND length(_details) > 500 THEN
    RAISE EXCEPTION 'Details too long';
  END IF;

  -- Only retain suggested_date for wrong_date reports, and reject absurd values.
  effective_suggested := CASE
    WHEN _reason = 'wrong_date'::event_flag_reason
      AND _suggested_date IS NOT NULL
      AND _suggested_date >= '2020-01-01'::date
      AND _suggested_date <= (current_date + interval '5 years')::date
    THEN _suggested_date
    ELSE NULL
  END;

  INSERT INTO public.event_flags (event_id, reason, details, suggested_date)
  VALUES (_event_id, _reason, NULLIF(trim(_details), ''), effective_suggested)
  RETURNING public.event_flags.id, public.event_flags.delete_token INTO new_id, new_token;

  id := new_id;
  delete_token := new_token;
  RETURN NEXT;
END;
$function$;