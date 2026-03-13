
CREATE OR REPLACE FUNCTION public.validate_trip_status()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'funded', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid trip status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
