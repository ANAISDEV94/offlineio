
-- 1. stripe_connect_accounts
CREATE TABLE public.stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_account_id text UNIQUE,
  account_type text NOT NULL DEFAULT 'express',
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own connect account"
  ON public.stripe_connect_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. webhook_events
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE,
  event_type text,
  processed boolean NOT NULL DEFAULT false,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_webhook_events_stripe_event_id ON public.webhook_events (stripe_event_id);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events (event_type);

-- 3. Add columns to trips
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS funded_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';

-- Validation trigger for trips.status
CREATE OR REPLACE FUNCTION public.validate_trip_status()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'funded', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid trip status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_trip_status
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.validate_trip_status();

-- 4. recalculate_trip_funding function
CREATE OR REPLACE FUNCTION public.recalculate_trip_funding(_trip_id uuid)
  RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_contributed numeric;
  v_total_cost numeric;
  v_new_status text;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_contributed
  FROM payment_history
  WHERE trip_id = _trip_id AND status = 'paid';

  SELECT total_cost INTO v_total_cost
  FROM trips WHERE id = _trip_id;

  IF v_total_cost IS NULL THEN
    RAISE EXCEPTION 'Trip not found: %', _trip_id;
  END IF;

  IF v_total_contributed >= v_total_cost AND v_total_cost > 0 THEN
    v_new_status := 'funded';
  ELSE
    v_new_status := 'active';
  END IF;

  UPDATE trips
  SET funded_amount = v_total_contributed, status = v_new_status
  WHERE id = _trip_id;

  RETURN json_build_object(
    'trip_id', _trip_id,
    'total_cost', v_total_cost,
    'funded_amount', v_total_contributed,
    'status', v_new_status
  );
END;
$$;
