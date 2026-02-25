CREATE POLICY "Organizers can update members"
ON public.trip_members FOR UPDATE
USING (is_trip_organizer(auth.uid(), trip_id));