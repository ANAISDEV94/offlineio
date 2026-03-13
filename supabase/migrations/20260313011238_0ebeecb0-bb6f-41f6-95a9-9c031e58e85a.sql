
-- 1. contributions table
CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text UNIQUE,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view trip contributions"
  ON public.contributions FOR SELECT TO authenticated
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Users can insert own contributions"
  ON public.contributions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Add columns to user_payment_methods
ALTER TABLE public.user_payment_methods
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;

-- 3. Add column to payment_history
ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS stripe_event_id text;
