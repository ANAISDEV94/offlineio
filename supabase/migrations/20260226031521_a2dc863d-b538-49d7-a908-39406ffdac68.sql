
-- Create trip_member_funding view using a subquery for member count
CREATE OR REPLACE VIEW public.trip_member_funding AS
WITH member_counts AS (
  SELECT trip_id, COUNT(*)::int AS cnt
  FROM public.trip_members
  GROUP BY trip_id
)
SELECT
  tm.trip_id,
  tm.user_id,
  tm.role,
  pr.display_name,
  COALESCE(p.amount_paid, 0) AS amount_paid,
  CASE WHEN mc.cnt > 0 THEN t.total_cost / mc.cnt ELSE 0 END AS per_person_cost,
  CASE WHEN mc.cnt > 0 THEN (t.total_cost / mc.cnt) - COALESCE(p.amount_paid, 0) ELSE 0 END AS amount_remaining,
  CASE
    WHEN mc.cnt > 0 AND COALESCE(p.amount_paid, 0) >= (t.total_cost / mc.cnt) THEN 'Paid'
    WHEN t.payment_deadline IS NOT NULL AND (t.payment_deadline - CURRENT_DATE) <= 7 THEN 'Behind'
    ELSE 'On Track'
  END AS member_status,
  CASE
    WHEN mc.cnt > 0 AND (t.total_cost / mc.cnt) > 0
    THEN LEAST(100, ROUND(COALESCE(p.amount_paid, 0) / (t.total_cost / mc.cnt) * 100))
    ELSE 0
  END AS pct_complete
FROM public.trip_members tm
JOIN public.trips t ON t.id = tm.trip_id
JOIN member_counts mc ON mc.trip_id = tm.trip_id
LEFT JOIN public.profiles pr ON pr.user_id = tm.user_id
LEFT JOIN public.payments p ON p.trip_id = tm.trip_id AND p.user_id = tm.user_id;
