-- Allow members (creators) to update their own draft/dismissed plan items
CREATE POLICY "Creators can update own plan items"
ON public.trip_plan_items
FOR UPDATE
USING (
  auth.uid() = created_by
  AND is_trip_member(auth.uid(), trip_id)
  AND status IN ('draft', 'dismissed', 'approved')
)
WITH CHECK (
  auth.uid() = created_by
  AND is_trip_member(auth.uid(), trip_id)
  AND status IN ('draft', 'dismissed', 'approved')
);