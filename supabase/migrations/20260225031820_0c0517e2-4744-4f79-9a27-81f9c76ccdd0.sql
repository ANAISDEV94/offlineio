
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  group_size INTEGER NOT NULL DEFAULT 4,
  vibe TEXT NOT NULL DEFAULT 'luxury',
  per_person_budget NUMERIC NOT NULL DEFAULT 0,
  payment_deadline DATE,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trip members table (stores roles)
CREATE TABLE public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- Helper function: is user a member of a trip?
CREATE OR REPLACE FUNCTION public.is_trip_member(_user_id UUID, _trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE user_id = _user_id AND trip_id = _trip_id
  );
$$;

-- Helper function: is user organizer of a trip?
CREATE OR REPLACE FUNCTION public.is_trip_organizer(_user_id UUID, _trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE user_id = _user_id AND trip_id = _trip_id AND role = 'organizer'
  );
$$;

-- Trips RLS
CREATE POLICY "Members can view their trips" ON public.trips FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create trips" ON public.trips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Organizers can update trips" ON public.trips FOR UPDATE TO authenticated
  USING (public.is_trip_organizer(auth.uid(), id));
CREATE POLICY "Organizers can delete trips" ON public.trips FOR DELETE TO authenticated
  USING (public.is_trip_organizer(auth.uid(), id));

-- Trip members RLS
CREATE POLICY "Members can view trip members" ON public.trip_members FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Organizers can add members" ON public.trip_members FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id) OR auth.uid() = user_id);
CREATE POLICY "Organizers can remove members" ON public.trip_members FOR DELETE TO authenticated
  USING (public.is_trip_organizer(auth.uid(), trip_id));

-- Itinerary items
CREATE TABLE public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  time TEXT,
  activity TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view itinerary" ON public.itinerary_items FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Members can add itinerary" ON public.itinerary_items FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Members can update itinerary" ON public.itinerary_items FOR UPDATE TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Members can delete itinerary" ON public.itinerary_items FOR DELETE TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));

-- Budget categories
CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view budget" ON public.budget_categories FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Organizers can manage budget" ON public.budget_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));
CREATE POLICY "Organizers can update budget" ON public.budget_categories FOR UPDATE TO authenticated
  USING (public.is_trip_organizer(auth.uid(), trip_id));
CREATE POLICY "Organizers can delete budget" ON public.budget_categories FOR DELETE TO authenticated
  USING (public.is_trip_organizer(auth.uid(), trip_id));

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  next_due_date DATE,
  installment_plan TEXT NOT NULL DEFAULT 'monthly' CHECK (installment_plan IN ('weekly', 'biweekly', 'monthly', 'custom')),
  auto_pay BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view payments" ON public.payments FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Users can update own payment" ON public.payments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Organizers can insert payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_organizer(auth.uid(), trip_id));

-- Outfit posts
CREATE TABLE public.outfit_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT 'day 1',
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outfit_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view outfits" ON public.outfit_posts FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Members can post outfits" ON public.outfit_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_member(auth.uid(), trip_id) AND auth.uid() = user_id);
CREATE POLICY "Users can delete own outfits" ON public.outfit_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Outfit reactions
CREATE TABLE public.outfit_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_post_id UUID REFERENCES public.outfit_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outfit_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view reactions" ON public.outfit_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.outfit_posts op WHERE op.id = outfit_post_id AND public.is_trip_member(auth.uid(), op.trip_id)
  ));
CREATE POLICY "Members can add reactions" ON public.outfit_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.outfit_posts op WHERE op.id = outfit_post_id AND public.is_trip_member(auth.uid(), op.trip_id)
  ));

-- Packing items
CREATE TABLE public.packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  is_suggested BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own packing" ON public.packing_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can add packing items" ON public.packing_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Users can update own packing" ON public.packing_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own packing" ON public.packing_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('flight', 'hotel', 'activity')),
  title TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  price NUMERIC,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view bookings" ON public.bookings FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Members can add bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_member(auth.uid(), trip_id) AND auth.uid() = created_by);
CREATE POLICY "Users can delete own bookings" ON public.bookings FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Notifications / Hype messages
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'hype' CHECK (type IN ('hype', 'payment_reminder', 'packing_reminder')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  trigger_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (user_id IS NULL AND public.is_trip_member(auth.uid(), trip_id)));
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_member(auth.uid(), trip_id));

-- Outfit storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('outfits', 'outfits', true);
CREATE POLICY "Members can upload outfits" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'outfits');
CREATE POLICY "Anyone can view outfits" ON storage.objects FOR SELECT USING (bucket_id = 'outfits');

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
