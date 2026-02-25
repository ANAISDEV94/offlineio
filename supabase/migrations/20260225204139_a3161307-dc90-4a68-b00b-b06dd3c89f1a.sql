
-- Add public trip columns to trips table
ALTER TABLE public.trips
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN host_bio TEXT NULL,
  ADD COLUMN trip_description TEXT NULL,
  ADD COLUMN max_spots INTEGER NULL,
  ADD COLUMN min_spots_required INTEGER NULL,
  ADD COLUMN join_deadline DATE NULL,
  ADD COLUMN cover_image_url TEXT NULL,
  ADD COLUMN is_verified_host BOOLEAN NOT NULL DEFAULT false;

-- Add is_creator to profiles
ALTER TABLE public.profiles
  ADD COLUMN is_creator BOOLEAN NOT NULL DEFAULT false;

-- Allow any authenticated user to view public trips
CREATE POLICY "Anyone can view public trips"
ON public.trips
FOR SELECT
USING (visibility = 'public');

-- Create trip-covers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-covers', 'trip-covers', true);

-- Allow authenticated users to upload covers
CREATE POLICY "Authenticated users can upload trip covers"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'trip-covers' AND auth.role() = 'authenticated');

-- Allow public read of trip covers
CREATE POLICY "Anyone can view trip covers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'trip-covers');

-- Allow users to update/delete own trip covers
CREATE POLICY "Users can manage own trip covers"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'trip-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own trip covers"
ON storage.objects
FOR DELETE
USING (bucket_id = 'trip-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Also allow self-join for public trips (member inserting themselves)
CREATE POLICY "Users can join public trips"
ON public.trip_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = trip_id AND visibility = 'public'
  )
);

-- Allow self-insert payment when joining a public trip
CREATE POLICY "Users can create own payment for public trips"
ON public.payments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = trip_id AND visibility = 'public'
  )
);
