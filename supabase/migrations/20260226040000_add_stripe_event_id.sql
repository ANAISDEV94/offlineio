-- Add stripe_event_id to payment_history for webhook idempotency.
-- The unique constraint prevents duplicate Stripe events from creating
-- duplicate payment records.

ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS stripe_event_id text;

ALTER TABLE public.payment_history
  ADD CONSTRAINT uq_payment_history_stripe_event_id UNIQUE (stripe_event_id);

-- Index for fast lookups by trip + user
CREATE INDEX IF NOT EXISTS idx_payment_history_trip_user
  ON public.payment_history(trip_id, user_id);
