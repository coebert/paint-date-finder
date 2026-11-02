-- 1. Evidence columns
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS review_basis text,
  ADD COLUMN IF NOT EXISTS quarantined_at timestamptz,
  ADD COLUMN IF NOT EXISTS quarantine_reason text;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_verification_status_chk;
ALTER TABLE public.events ADD CONSTRAINT events_verification_status_chk CHECK (verification_status = ANY (ARRAY[
  'verified','unverified','stale','missing','source_confirmed','human_reviewed','needs_evidence','unavailable','contradicted','quarantined']));
ALTER TABLE public.events ADD CONSTRAINT events_review_basis_chk CHECK (review_basis IS NULL OR review_basis = ANY (ARRAY['organiser_source','human_review','legacy']));

ALTER TABLE public.event_submissions
  ADD COLUMN IF NOT EXISTS source_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_hash text,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS submission_kind text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS related_event_id uuid;
ALTER TABLE public.event_submissions ADD CONSTRAINT event_submissions_evidence_status_chk CHECK (evidence_status = ANY (ARRAY['none','source_confirmed']));
ALTER TABLE public.event_submissions ADD CONSTRAINT event_submissions_kind_chk CHECK (submission_kind = ANY (ARRAY['new','evidence','correction','cancellation']));

-- 2. Review history
CREATE TABLE public.event_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  before jsonb,
  after jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_review_log TO authenticated;
GRANT ALL ON public.event_review_log TO service_role;
ALTER TABLE public.event_review_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read review log" ON public.event_review_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Visitors can't forge evidence on public submissions
CREATE OR REPLACE FUNCTION public.guard_submission_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.evidence_status := 'none';
    NEW.evidence := '{}'::jsonb;
    NEW.source_hash := NULL;
    NEW.source_fetched_at := NULL;
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.submission_kind := 'new';
      NEW.related_event_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_submission_evidence BEFORE INSERT ON public.event_submissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_submission_evidence();

-- 4. Events guard: real dates, source link required to publish, no unearned "source_confirmed"
CREATE OR REPLACE FUNCTION public.guard_event_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.event_date IS DISTINCT FROM OLD.event_date THEN
    IF NEW.event_date < DATE '2000-01-01' OR NEW.event_date > (current_date + interval '3 years')::date THEN
      RAISE EXCEPTION 'Event date out of range';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.source_url IS NULL THEN
      RAISE EXCEPTION 'A source link is required to publish an event';
    END IF;
    IF NEW.review_basis IS NULL THEN NEW.review_basis := 'human_review'; END IF;
    IF NEW.verification_status IN ('unverified','verified') AND NEW.review_basis = 'human_review' THEN
      NEW.verification_status := 'human_reviewed';
    END IF;
  END IF;
  IF NEW.verification_status = 'source_confirmed'
     AND (NEW.source_url IS NULL OR NEW.source_quote IS NULL OR length(trim(NEW.source_quote)) < 20) THEN
    RAISE EXCEPTION 'source_confirmed requires a source link and a verbatim excerpt';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_event_evidence BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_evidence();

-- 5. Quarantined events hidden from the public, still visible to admins
DROP POLICY IF EXISTS "Events are publicly viewable" ON public.events;
CREATE POLICY "Listed events are publicly viewable" ON public.events FOR SELECT
  USING (verification_status <> 'quarantined');
CREATE POLICY "Admins can view all events" ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. merge_event_source: admin-only, appends provenance, never overwrites live details
CREATE OR REPLACE FUNCTION public.merge_event_source(_event_id uuid, _source jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing jsonb; src_url text := _source->>'source_url';
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT merged_sources INTO existing FROM public.events WHERE id = _event_id;
  existing := coalesce(existing, '[]'::jsonb);
  IF src_url IS NOT NULL AND src_url <> '' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(existing) e WHERE e->>'source_url' = src_url) THEN
    RETURN;
  END IF;
  UPDATE public.events
    SET merged_sources = existing || jsonb_build_array(_source || jsonb_build_object('merged_at', now())),
        updated_at = now()
    WHERE id = _event_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.merge_event_source(uuid, jsonb) FROM PUBLIC, anon;

-- 7. Quarantine / reinstate (reversible, logged)
CREATE OR REPLACE FUNCTION public.quarantine_event(_id uuid, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before_row jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR coalesce(auth.role(),'') = 'service_role') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'A precise reason is required'; END IF;
  SELECT to_jsonb(e) INTO before_row FROM public.events e WHERE id = _id FOR UPDATE;
  IF before_row IS NULL THEN RETURN false; END IF;
  UPDATE public.events SET verification_status = 'quarantined', quarantined_at = now(),
    quarantine_reason = left(trim(_reason), 500) WHERE id = _id;
  INSERT INTO public.event_review_log (event_id, action, reason, before, actor)
    VALUES (_id, 'quarantine', left(trim(_reason), 500), before_row, auth.uid());
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.reinstate_event(_id uuid, _source_url text, _source_quote text, _note text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before_row jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _source_url IS NULL OR _source_url !~ '^https?://' THEN RAISE EXCEPTION 'A source link is required'; END IF;
  IF _source_quote IS NULL OR length(trim(_source_quote)) < 20 THEN RAISE EXCEPTION 'Paste the source excerpt that states the date'; END IF;
  IF _note IS NULL OR length(trim(_note)) < 5 THEN RAISE EXCEPTION 'Add a review note'; END IF;
  SELECT to_jsonb(e) INTO before_row FROM public.events e WHERE id = _id FOR UPDATE;
  IF before_row IS NULL THEN RETURN false; END IF;
  UPDATE public.events SET verification_status = 'human_reviewed', review_basis = 'human_review',
    quarantined_at = NULL, quarantine_reason = NULL,
    source_url = _source_url, source_quote = left(trim(_source_quote), 500),
    verification_notes = left(trim(_note), 500), last_verified_at = now(),
    evidence = evidence || jsonb_build_object('reviewed_by', auth.uid(), 'reviewed_at', now(), 'note', left(trim(_note),500))
  WHERE id = _id;
  INSERT INTO public.event_review_log (event_id, action, reason, before, actor)
    VALUES (_id, 'reinstate', left(trim(_note), 500), before_row, auth.uid());
  RETURN true;
END $$;

-- 8. Approval: requires a source link + explicit admin date check; preserves evidence
CREATE OR REPLACE FUNCTION public.approve_submission(_id uuid, _source_url text, _confirmed_source_date boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE s public.event_submissions; src text; dup uuid; new_id uuid; before_row jsonb;
  confirmed boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO s FROM public.event_submissions WHERE id = _id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  src := coalesce(nullif(trim(_source_url), ''), s.source_url);
  IF src IS NULL OR src !~ '^https?://' THEN RAISE EXCEPTION 'A source link (organiser, venue or event page) is required'; END IF;
  IF coalesce(_confirmed_source_date, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Confirm you checked the source shows this exact date';
  END IF;
  confirmed := s.evidence_status = 'source_confirmed' AND src = s.source_url;

  IF s.submission_kind IN ('evidence','cancellation','correction') THEN
    IF s.related_event_id IS NULL THEN RAISE EXCEPTION 'No linked event'; END IF;
    SELECT to_jsonb(e) INTO before_row FROM public.events e WHERE id = s.related_event_id FOR UPDATE;
    IF s.submission_kind = 'evidence' THEN
      UPDATE public.events SET source_url = src, source_quote = coalesce(s.source_quote, source_quote),
        evidence = s.evidence || jsonb_build_object('approved_from_submission', s.id, 'reviewed_by', auth.uid(), 'reviewed_at', now()),
        verification_status = CASE WHEN confirmed THEN 'source_confirmed' ELSE 'human_reviewed' END,
        review_basis = CASE WHEN confirmed THEN 'organiser_source' ELSE 'human_review' END,
        last_verified_at = now()
      WHERE id = s.related_event_id;
    ELSIF s.submission_kind = 'cancellation' THEN
      UPDATE public.events SET verification_status = 'quarantined', quarantined_at = now(),
        quarantine_reason = 'Cancelled per source: ' || src WHERE id = s.related_event_id;
    END IF;
    INSERT INTO public.event_review_log (event_id, action, reason, before, actor)
      VALUES (s.related_event_id, 'approve_' || s.submission_kind, coalesce(_notes, s.source_quote), before_row, auth.uid());
    new_id := s.related_event_id;
  ELSE
    SELECT id INTO dup FROM public.events
      WHERE event_date = s.event_date
        AND extensions.similarity(lower(venue_name), lower(s.venue_name)) > 0.6
        AND extensions.similarity(lower(title), lower(s.title)) > 0.6
        AND event_type = s.event_type
      LIMIT 1;
    IF dup IS NOT NULL THEN
      PERFORM public.merge_event_source(dup, jsonb_build_object('source_url', src, 'source_quote', s.source_quote,
        'merged_from_submission_id', s.id));
      new_id := dup;
    ELSE
      INSERT INTO public.events (title, description, event_type, venue_name, venue_location, event_date,
        start_time, end_time, booking_url, price_info, source_url, source_quote, image_url, is_verified,
        verification_status, review_basis, evidence, last_verified_at)
      VALUES (s.title, s.description, s.event_type, s.venue_name, s.venue_location, s.event_date,
        s.start_time, s.end_time, s.booking_url, s.price_info, src, s.source_quote, s.image_url, true,
        CASE WHEN confirmed THEN 'source_confirmed' ELSE 'human_reviewed' END,
        CASE WHEN confirmed THEN 'organiser_source' ELSE 'human_review' END,
        s.evidence || jsonb_build_object('approved_from_submission', s.id, 'reviewed_by', auth.uid(), 'reviewed_at', now()),
        now())
      RETURNING id INTO new_id;
      INSERT INTO public.event_review_log (event_id, action, reason, actor)
        VALUES (new_id, 'publish', coalesce(_notes, 'Approved from submission'), auth.uid());
    END IF;
  END IF;

  UPDATE public.event_submissions SET status = 'approved', reviewed_at = now(),
    admin_notes = concat_ws(E'\n', nullif(_notes, ''), CASE WHEN dup IS NOT NULL THEN 'Matched existing event ' || dup END)
  WHERE id = _id;
  RETURN jsonb_build_object('event_id', new_id, 'duplicate', dup IS NOT NULL, 'basis', CASE WHEN confirmed THEN 'organiser_source' ELSE 'human_review' END);
END $$;

REVOKE EXECUTE ON FUNCTION public.quarantine_event(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reinstate_event(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_submission(uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quarantine_event(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reinstate_event(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid, text, boolean, text) TO authenticated;

-- 9. Existing data: label, don't delete. Missing evidence is not proof of fiction.
UPDATE public.events SET review_basis = 'legacy' WHERE review_basis IS NULL;
UPDATE public.events SET verification_status = 'needs_evidence',
  verification_notes = coalesce(verification_notes, 'Listed before evidence checks; no source excerpt on record')
WHERE event_date >= current_date AND verification_status = 'unverified'
  AND (source_quote IS NULL OR length(trim(source_quote)) < 20);