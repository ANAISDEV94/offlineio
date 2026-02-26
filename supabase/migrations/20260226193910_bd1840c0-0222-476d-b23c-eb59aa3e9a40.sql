
-- 1. recalc_trip_total function
CREATE OR REPLACE FUNCTION public.recalc_trip_total(p_trip_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(price), 0) INTO v_total
  FROM bookings WHERE trip_id = p_trip_id;

  UPDATE trips SET total_cost = v_total WHERE id = p_trip_id;
  RETURN v_total;
END;
$$;

-- 2. Trigger function
CREATE OR REPLACE FUNCTION public.trg_recalc_trip_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_trip_total(OLD.trip_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_trip_total(NEW.trip_id);
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Trigger on bookings
CREATE TRIGGER bookings_recalc_total
AFTER INSERT OR UPDATE OF price OR DELETE
ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_recalc_trip_total();

-- 4. RPC for trip funding summary
CREATE OR REPLACE FUNCTION public.get_trip_funding_summary(p_trip_id uuid)
RETURNS TABLE(
  trip_id uuid, trip_name text, total_cost numeric,
  member_count int, per_person_cost numeric,
  total_funded numeric, total_remaining numeric,
  percent_funded numeric, payment_deadline date,
  days_to_deadline int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM trip_funding_summary
  WHERE trip_id = p_trip_id
    AND is_trip_member(auth.uid(), p_trip_id);
$$;

-- 5. RPC for member funding
CREATE OR REPLACE FUNCTION public.get_member_funding(p_trip_id uuid)
RETURNS TABLE(
  trip_id uuid, user_id uuid, role text,
  display_name text, amount_paid numeric,
  per_person_cost numeric, amount_remaining numeric,
  member_status text, pct_complete numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM trip_member_funding
  WHERE trip_id = p_trip_id
    AND is_trip_member(auth.uid(), p_trip_id);
$$;
