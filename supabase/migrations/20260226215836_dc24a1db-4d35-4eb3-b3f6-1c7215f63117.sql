
-- trip_plan_sessions: stores Q&A answers + generated plan
CREATE TABLE public.trip_plan_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers_json jsonb,
  generated_plan_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_plan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view plan sessions"
  ON public.trip_plan_sessions FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Users can create own plan sessions"
  ON public.trip_plan_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_trip_member(auth.uid(), trip_id));

-- trip_plan_items: individual budget/itinerary items
CREATE TABLE public.trip_plan_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  est_cost numeric,
  day_number integer,
  time_block text,
  source_url text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view plan items"
  ON public.trip_plan_items FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Members can insert plan items"
  ON public.trip_plan_items FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Organizers can update plan items"
  ON public.trip_plan_items FOR UPDATE
  USING (is_trip_organizer(auth.uid(), trip_id));

CREATE POLICY "Organizers can delete plan items"
  ON public.trip_plan_items FOR DELETE
  USING (is_trip_organizer(auth.uid(), trip_id));

-- Also allow the item creator to delete their own drafts
CREATE POLICY "Creators can delete own draft items"
  ON public.trip_plan_items FOR DELETE
  USING (auth.uid() = created_by AND status = 'draft');
