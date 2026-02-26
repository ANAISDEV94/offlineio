
-- Add total_cost to trips
ALTER TABLE public.trips ADD COLUMN total_cost numeric NOT NULL DEFAULT 0;

-- Create payment_history table
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payment history"
ON public.payment_history FOR SELECT
USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Users can insert own payment history"
ON public.payment_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add autopay_enabled to payments (payments already has auto_pay boolean, so skip if exists)
-- Checking schema: payments already has auto_pay column, so no change needed
