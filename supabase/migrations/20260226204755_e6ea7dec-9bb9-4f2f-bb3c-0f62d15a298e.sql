
-- 1. member_share_overrides table
CREATE TABLE public.member_share_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  share_amount numeric NOT NULL,
  set_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

ALTER TABLE public.member_share_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage share overrides"
  ON public.member_share_overrides FOR ALL
  USING (is_trip_organizer(auth.uid(), trip_id))
  WITH CHECK (is_trip_organizer(auth.uid(), trip_id));

CREATE POLICY "Members can view own share override"
  ON public.member_share_overrides FOR SELECT
  USING (auth.uid() = user_id);

-- 2. update_trip_total function
CREATE OR REPLACE FUNCTION public.update_trip_total(p_trip_id uuid, p_total numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_trip_organizer(auth.uid(), p_trip_id) THEN
    RAISE EXCEPTION 'Only organizers can update trip total';
  END IF;
  UPDATE trips SET total_cost = p_total WHERE id = p_trip_id;
  RETURN p_total;
END;
$$;

-- 3. set_member_share_override function
CREATE OR REPLACE FUNCTION public.set_member_share_override(p_trip_id uuid, p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_trip_organizer(auth.uid(), p_trip_id) THEN
    RAISE EXCEPTION 'Only organizers can set share overrides';
  END IF;
  INSERT INTO member_share_overrides (trip_id, user_id, share_amount, set_by)
  VALUES (p_trip_id, p_user_id, p_amount, auth.uid())
  ON CONFLICT (trip_id, user_id) DO UPDATE SET share_amount = p_amount, set_by = auth.uid();
END;
$$;

-- 4. Drop and recreate trip_member_funding view to incorporate overrides
DROP VIEW IF EXISTS public.trip_member_funding;
CREATE OR REPLACE VIEW public.trip_member_funding AS
SELECT
  tm.trip_id,
  tm.user_id,
  tm.role,
  p.display_name,
  COALESCE(mso.share_amount, CASE WHEN mc.cnt > 0 THEN t.total_cost / mc.cnt ELSE 0 END) AS per_person_cost,
  COALESCE(pay.amount_paid, 0) AS amount_paid,
  GREATEST(0, COALESCE(mso.share_amount, CASE WHEN mc.cnt > 0 THEN t.total_cost / mc.cnt ELSE 0 END) - COALESCE(pay.amount_paid, 0)) AS amount_remaining,
  CASE
    WHEN COALESCE(pay.amount_paid, 0) >= COALESCE(mso.share_amount, CASE WHEN mc.cnt > 0 THEN t.total_cost / mc.cnt ELSE 0 END) THEN 'Paid'
    WHEN t.payment_deadline IS NOT NULL AND t.payment_deadline - CURRENT_DATE <= 7 THEN 'Behind'
    ELSE 'On Track'
  END AS member_status,
  CASE
    WHEN COALESCE(mso.share_amount, CASE WHEN mc.cnt > 0 THEN t.total_cost / mc.cnt ELSE 0 END) > 0
    THEN ROUND(COALESCE(pay.amount_paid, 0) / COALESCE(mso.share_amount, CASE WHEN mc.cnt > 0 THEN t.total_cost / mc.cnt ELSE 0 END) * 100, 1)
    ELSE 100
  END AS pct_complete
FROM trip_members tm
JOIN trips t ON t.id = tm.trip_id
JOIN profiles p ON p.user_id = tm.user_id
LEFT JOIN payments pay ON pay.trip_id = tm.trip_id AND pay.user_id = tm.user_id
LEFT JOIN member_share_overrides mso ON mso.trip_id = tm.trip_id AND mso.user_id = tm.user_id
LEFT JOIN LATERAL (SELECT COUNT(*)::numeric AS cnt FROM trip_members WHERE trip_id = tm.trip_id) mc ON true;

-- 5. Drop and recreate trip_funding_summary view
DROP VIEW IF EXISTS public.trip_funding_summary;
CREATE OR REPLACE VIEW public.trip_funding_summary AS
SELECT
  t.id AS trip_id,
  t.name AS trip_name,
  t.total_cost,
  mc.cnt::integer AS member_count,
  CASE WHEN mc.cnt > 0 THEN t.total_cost / mc.cnt ELSE 0 END AS per_person_cost,
  COALESCE(funded.total, 0) AS total_funded,
  GREATEST(0, t.total_cost - COALESCE(funded.total, 0)) AS total_remaining,
  CASE WHEN t.total_cost > 0 THEN ROUND(COALESCE(funded.total, 0) / t.total_cost * 100, 1) ELSE 0 END AS percent_funded,
  t.payment_deadline,
  CASE WHEN t.payment_deadline IS NOT NULL THEN (t.payment_deadline - CURRENT_DATE)::integer ELSE NULL END AS days_to_deadline
FROM trips t
LEFT JOIN LATERAL (SELECT COUNT(*) AS cnt FROM trip_members WHERE trip_id = t.id) mc ON true
LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments WHERE trip_id = t.id) funded ON true;

-- 6. get_trip_dashboard function
CREATE OR REPLACE FUNCTION public.get_trip_dashboard(p_trip_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result json;
  v_trip record;
  v_summary record;
  v_members json;
  v_current_user json;
  v_has_pm boolean;
  v_health_score integer;
  v_health_label text;
  v_days_to_trip integer;
  v_pct_funded numeric;
  v_pct_on_track numeric;
  v_deadline_buffer numeric;
  v_late_penalty numeric;
  v_late_count integer;
  v_total_members integer;
  v_on_track_count integer;
BEGIN
  -- Auth check
  IF NOT is_trip_member(v_user_id, p_trip_id) THEN
    RAISE EXCEPTION 'Not a trip member';
  END IF;

  -- Trip
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;

  -- Summary
  SELECT * INTO v_summary FROM trip_funding_summary WHERE trip_id = p_trip_id;

  -- Days to trip
  v_days_to_trip := (v_trip.start_date - CURRENT_DATE)::integer;

  -- Funded percent (0-1)
  v_pct_funded := CASE WHEN v_trip.total_cost > 0
    THEN LEAST(1, COALESCE(v_summary.total_funded, 0) / v_trip.total_cost)
    ELSE 0 END;

  -- Members array
  SELECT COUNT(*) INTO v_total_members FROM trip_member_funding WHERE trip_id = p_trip_id;
  SELECT COUNT(*) INTO v_late_count FROM trip_member_funding WHERE trip_id = p_trip_id AND member_status = 'Behind';
  SELECT COUNT(*) INTO v_on_track_count FROM trip_member_funding WHERE trip_id = p_trip_id AND member_status IN ('Paid', 'On Track');

  v_pct_on_track := CASE WHEN v_total_members > 0 THEN v_on_track_count::numeric / v_total_members * 100 ELSE 100 END;
  v_deadline_buffer := CASE WHEN v_summary.days_to_deadline IS NULL THEN 100
    ELSE LEAST(100, GREATEST(0, v_summary.days_to_deadline::numeric / 30 * 100)) END;
  v_late_penalty := CASE WHEN v_total_members > 0 THEN GREATEST(0, 100 - v_late_count::numeric / v_total_members * 100) ELSE 100 END;

  v_health_score := ROUND(
    (v_pct_funded * 100) * 0.4 +
    v_pct_on_track * 0.3 +
    v_deadline_buffer * 0.2 +
    v_late_penalty * 0.1
  );

  IF v_health_score >= 80 THEN v_health_label := 'Healthy';
  ELSIF v_health_score >= 60 THEN v_health_label := 'At Risk';
  ELSIF v_health_score >= 40 THEN v_health_label := 'Needs Action';
  ELSE v_health_label := 'Critical';
  END IF;

  -- Members JSON
  SELECT json_agg(json_build_object(
    'user_id', mf.user_id,
    'display_name', mf.display_name,
    'role', mf.role,
    'share', mf.per_person_cost,
    'paid', mf.amount_paid,
    'remaining', mf.amount_remaining,
    'status', mf.member_status,
    'pct_complete', mf.pct_complete
  )) INTO v_members
  FROM trip_member_funding mf WHERE mf.trip_id = p_trip_id;

  -- Payment method check
  SELECT EXISTS(SELECT 1 FROM user_payment_methods WHERE user_id = v_user_id) INTO v_has_pm;

  -- Current user
  SELECT json_build_object(
    'user_id', mf.user_id,
    'role', mf.role,
    'display_name', mf.display_name,
    'share', mf.per_person_cost,
    'paid', mf.amount_paid,
    'owe', mf.amount_remaining,
    'status', mf.member_status,
    'has_payment_method', v_has_pm
  ) INTO v_current_user
  FROM trip_member_funding mf
  WHERE mf.trip_id = p_trip_id AND mf.user_id = v_user_id;

  -- Build result
  v_result := json_build_object(
    'trip_id', v_trip.id,
    'trip_name', v_trip.name,
    'destination', v_trip.destination,
    'start_date', v_trip.start_date,
    'end_date', v_trip.end_date,
    'vibe', v_trip.vibe,
    'cover_image_url', v_trip.cover_image_url,
    'visibility', v_trip.visibility,
    'invite_code', v_trip.invite_code,
    'created_by', v_trip.created_by,
    'max_spots', COALESCE(v_trip.max_spots, v_trip.group_size),
    'total_cost', v_trip.total_cost,
    'per_person_cost', COALESCE(v_summary.per_person_cost, 0),
    'funded_total', COALESCE(v_summary.total_funded, 0),
    'remaining_total', COALESCE(v_summary.total_remaining, 0),
    'funded_percent', v_pct_funded,
    'payment_deadline', v_trip.payment_deadline,
    'days_to_deadline', v_summary.days_to_deadline,
    'days_to_trip', v_days_to_trip,
    'health_score', v_health_score,
    'health_label', v_health_label,
    'current_user', v_current_user,
    'members', COALESCE(v_members, '[]'::json)
  );

  RETURN v_result;
END;
$$;
