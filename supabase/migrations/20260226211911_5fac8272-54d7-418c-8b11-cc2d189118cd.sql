
-- 1. Auto-create payment row when a member is added
CREATE OR REPLACE FUNCTION public.auto_create_member_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_per_person numeric;
BEGIN
  SELECT CASE WHEN count(*) > 0 THEN t.total_cost / count(*)::numeric ELSE 0 END
  INTO v_per_person
  FROM trips t
  JOIN trip_members tm ON tm.trip_id = t.id
  WHERE t.id = NEW.trip_id
  GROUP BY t.total_cost;

  INSERT INTO payments (trip_id, user_id, amount, amount_paid, status)
  VALUES (NEW.trip_id, NEW.user_id, COALESCE(v_per_person, 0), 0, 'pending')
  ON CONFLICT DO NOTHING;

  UPDATE payments p
  SET amount = COALESCE(
    (SELECT share_amount FROM member_share_overrides WHERE trip_id = NEW.trip_id AND user_id = p.user_id),
    v_per_person
  )
  WHERE p.trip_id = NEW.trip_id
    AND NOT EXISTS (SELECT 1 FROM member_share_overrides WHERE trip_id = NEW.trip_id AND user_id = p.user_id AND share_amount IS NOT NULL);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_payment
  AFTER INSERT ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_member_payment();

-- 2. Auto-cleanup payment row when a member is removed
CREATE OR REPLACE FUNCTION public.auto_cleanup_member_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_per_person numeric;
BEGIN
  DELETE FROM payments WHERE trip_id = OLD.trip_id AND user_id = OLD.user_id;

  SELECT CASE WHEN count(*) > 0 THEN t.total_cost / count(*)::numeric ELSE 0 END
  INTO v_per_person
  FROM trips t
  JOIN trip_members tm ON tm.trip_id = t.id
  WHERE t.id = OLD.trip_id
  GROUP BY t.total_cost;

  UPDATE payments p
  SET amount = COALESCE(
    (SELECT share_amount FROM member_share_overrides WHERE trip_id = OLD.trip_id AND user_id = p.user_id),
    v_per_person
  )
  WHERE p.trip_id = OLD.trip_id
    AND NOT EXISTS (SELECT 1 FROM member_share_overrides WHERE trip_id = OLD.trip_id AND user_id = p.user_id AND share_amount IS NOT NULL);

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_auto_cleanup_payment
  AFTER DELETE ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_cleanup_member_payment();

-- 3. Auto-recalc shares when total_cost changes
CREATE OR REPLACE FUNCTION public.auto_recalc_shares_on_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_per_person numeric;
  v_member_count integer;
BEGIN
  IF NEW.total_cost IS DISTINCT FROM OLD.total_cost THEN
    SELECT count(*) INTO v_member_count FROM trip_members WHERE trip_id = NEW.id;
    v_per_person := CASE WHEN v_member_count > 0 THEN NEW.total_cost / v_member_count::numeric ELSE 0 END;

    UPDATE payments p
    SET amount = COALESCE(
      (SELECT share_amount FROM member_share_overrides WHERE trip_id = NEW.id AND user_id = p.user_id),
      v_per_person
    )
    WHERE p.trip_id = NEW.id
      AND NOT EXISTS (SELECT 1 FROM member_share_overrides WHERE trip_id = NEW.id AND user_id = p.user_id AND share_amount IS NOT NULL);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_on_total
  AFTER UPDATE OF total_cost ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.auto_recalc_shares_on_total();

-- 4. Add unique constraint on payments for ON CONFLICT to work
ALTER TABLE payments ADD CONSTRAINT payments_trip_user_unique UNIQUE (trip_id, user_id);

-- 5. Add DELETE policy on payments for the cleanup trigger (SECURITY DEFINER handles it, but good practice)
-- The trigger runs as SECURITY DEFINER so no additional RLS needed.
