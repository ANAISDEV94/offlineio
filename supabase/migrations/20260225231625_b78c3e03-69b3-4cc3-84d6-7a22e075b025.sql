
CREATE POLICY "Users can find trips by invite code"
ON public.trips FOR SELECT
USING (invite_code IS NOT NULL);

CREATE POLICY "Users can join trips with invite code"
ON public.trip_members FOR INSERT
WITH CHECK (auth.uid() = user_id);
