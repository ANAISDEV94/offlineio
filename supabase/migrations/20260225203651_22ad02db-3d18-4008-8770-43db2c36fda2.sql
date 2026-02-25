
-- Allow trip creators to read the trip they just created (before trip_members is inserted)
CREATE POLICY "Creators can view own trips"
ON public.trips
FOR SELECT
USING (auth.uid() = created_by);
