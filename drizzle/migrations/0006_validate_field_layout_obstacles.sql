CREATE OR REPLACE FUNCTION public.create_field_layout(_name text, _description text, _author_name text, _tags text[], _obstacles jsonb, _obstacle_count integer)
 RETURNS TABLE(id uuid, delete_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  new_token uuid;
  bad_count integer;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 OR length(_name) > 200 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF _description IS NOT NULL AND length(_description) > 2000 THEN
    RAISE EXCEPTION 'Description too long';
  END IF;
  IF _author_name IS NOT NULL AND length(_author_name) > 100 THEN
    RAISE EXCEPTION 'Author name too long';
  END IF;
  IF _tags IS NOT NULL AND (cardinality(_tags) > 20 OR EXISTS (SELECT 1 FROM unnest(_tags) t WHERE length(t) > 40)) THEN
    RAISE EXCEPTION 'Invalid tags';
  END IF;
  IF _obstacles IS NULL OR jsonb_typeof(_obstacles) <> 'array' THEN
    RAISE EXCEPTION 'Obstacles must be a list';
  END IF;
  IF jsonb_array_length(_obstacles) < 1 OR jsonb_array_length(_obstacles) > 500
     OR _obstacle_count IS DISTINCT FROM jsonb_array_length(_obstacles) THEN
    RAISE EXCEPTION 'Invalid obstacle_count';
  END IF;
  IF pg_column_size(_obstacles) > 200000 THEN
    RAISE EXCEPTION 'Layout too large';
  END IF;

  SELECT count(*) INTO bad_count
  FROM jsonb_array_elements(_obstacles) o
  WHERE jsonb_typeof(o) <> 'object'
     OR jsonb_typeof(o->'type') IS DISTINCT FROM 'string'
     OR o->>'type' NOT IN ('tall-cake','small-cake','dorito-big','dorito-small','snake','temple','temple-maya','brick','wing','mini-race','can','cone','giant-plus')
     OR jsonb_typeof(o->'x') IS DISTINCT FROM 'number'
     OR jsonb_typeof(o->'y') IS DISTINCT FROM 'number'
     OR (o->>'x')::numeric NOT BETWEEN 0 AND 100
     OR (o->>'y')::numeric NOT BETWEEN 0 AND 100
     OR (o ? 'rotation' AND jsonb_typeof(o->'rotation') <> 'number')
     OR (o ? 'label' AND (jsonb_typeof(o->'label') <> 'string' OR length(o->>'label') > 40));
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Invalid obstacles';
  END IF;

  INSERT INTO public.field_layouts (name, description, author_name, tags, obstacles, obstacle_count)
  VALUES (_name, NULLIF(trim(_description), ''), NULLIF(trim(_author_name), ''), COALESCE(_tags, '{}'::text[]), _obstacles, _obstacle_count)
  RETURNING public.field_layouts.id, public.field_layouts.delete_token INTO new_id, new_token;

  id := new_id;
  delete_token := new_token;
  RETURN NEXT;
END;
$function$;