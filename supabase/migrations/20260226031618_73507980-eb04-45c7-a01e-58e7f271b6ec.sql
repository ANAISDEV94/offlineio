
-- Fix security definer views by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.trip_funding_summary;
DROP VIEW IF EXISTS public.trip_member_funding;

CREATE VIEW public.trip_funding_summary WITH (security_invoker = true) AS
SELECT
  t.id AS trip_id,
  t.name AS trip_name,
  t.total_cost,
  COUNT(tm.id)::int AS member_count,
  CASE WHEN COUNT(tm.id) > 0 THEN t.total_cost / COUNT(tm.id) ELSE 0 END AS per_person_cost,
  COALESCE(SUM(p.amount_paid), 0) AS total_funded,
  t.total_cost - COALESCE(SUM(p.amount_paid), 0) AS total_remaining,
  CASE WHEN t.total_cost > 0 THEN ROUND(COALESCE(SUM(p.amount_paid), 0) / t.total_cost * 100) ELSE 0 END AS percent_funded,
  t.payment_deadline,
  CASE WHEN t.payment_deadline IS NOT NULL THEN (t.payment_deadline - CURRENT_DATE) ELSE NULL END AS days_to_deadline
FROM public.trips t
LEFT JOIN public.trip_members tm ON tm.trip_id = t.id
LEFT JOIN public.payments p ON p.trip_id = t.id AND p.user_id = tm.user_id
GROUP BY t.id, t.name, t.total_cost, t.payment_deadline;

CREATE VIEW public.trip_member_funding WITH (security_invoker = true) AS
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
