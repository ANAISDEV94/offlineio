
CREATE TABLE public.user_payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  card_brand text,
  card_last_four text,
  card_exp_month integer,
  card_exp_year integer,
  billing_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment method" ON public.user_payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment method" ON public.user_payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment method" ON public.user_payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment method" ON public.user_payment_methods FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_payment_methods_updated_at
  BEFORE UPDATE ON public.user_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
