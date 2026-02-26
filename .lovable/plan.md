

# Add Auto-Triggers for Funding Math

## Problem
The views (`trip_funding_summary`, `trip_member_funding`) and `get_trip_dashboard` function already compute everything dynamically -- per_person, responsibility, group funding percent all recalculate automatically on read. However, a `payments` row must exist per member for the funding math to track paid amounts. Currently this row is only created manually in one frontend handler, missing other join paths.

## Migration: Auto-create/cleanup payment rows via triggers

### 1. Trigger: `trg_auto_create_payment` on `trip_members` INSERT

When a member is added (any path -- organizer invite, invite code join, public trip join):
- Auto-insert a `payments` row with `amount = per_person_cost`, `amount_paid = 0`, `status = 'pending'`
- Uses the current `total_cost / member_count` for the amount
- Skips if a payment row already exists for that user+trip

```sql
CREATE OR REPLACE FUNCTION public.auto_create_member_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_per_person numeric;
BEGIN
  SELECT CASE WHEN count(*) > 0 THEN t.total_cost / count(*)::numeric ELSE 0 END
  INTO v_per_person
  FROM trips t
  JOIN trip_members tm ON tm.trip_id = t.id
  WHERE t.id = NEW.trip_id
  GROUP BY t.total_cost;

  INSERT INTO payments (trip_id, user_id, amount, amount_paid, status)
  VALUES (NEW.trip_id, NEW.user_id, COALESCE(v_per_person, 0), 0, 'pending')
  ON CONFLICT DO NOTHING;

  -- Update all existing payment amounts to reflect new per-person (unless share override exists)
  UPDATE payments p
  SET amount = COALESCE(
    (SELECT share_amount FROM member_share_overrides WHERE trip_id = NEW.trip_id AND user_id = p.user_id),
    v_per_person
  )
  WHERE p.trip_id = NEW.trip_id
    AND NOT EXISTS (SELECT 1 FROM member_share_overrides WHERE trip_id = NEW.trip_id AND user_id = p.user_id AND share_amount IS NOT NULL);

  RETURN NEW;
END;
$$;
```

### 2. Trigger: `trg_auto_cleanup_payment` on `trip_members` DELETE

When a member is removed:
- Delete their `payments` row
- Recalculate remaining members' payment amounts

### 3. Trigger: `trg_recalc_shares_on_total_change` on `trips` UPDATE of `total_cost`

When `total_cost` changes:
- Update all `payments.amount` for that trip to `new_total / member_count` (unless share override exists)

### 4. Seed/Test SQL

After creating the triggers, run a test:
- Query `trip_funding_summary` for the existing trip to confirm it returns correct computed values
- Query `trip_member_funding` to confirm per-member math
- Call `get_trip_dashboard` to confirm the full payload

## Objects Created

| Object | Type |
|--------|------|
| `auto_create_member_payment()` | Function (trigger) |
| `auto_cleanup_member_payment()` | Function (trigger) |
| `auto_recalc_shares_on_total()` | Function (trigger) |
| `trg_auto_create_payment` | Trigger on `trip_members` INSERT |
| `trg_auto_cleanup_payment` | Trigger on `trip_members` DELETE |
| `trg_recalc_on_total` | Trigger on `trips` UPDATE |

## Frontend Cleanup

Remove the manual `payments.insert` call from `OverviewTab.tsx` line 76 (the trigger now handles this automatically).

## No changes needed to

- Views (`trip_funding_summary`, `trip_member_funding`) -- already dynamic
- `get_trip_dashboard` function -- already reads from views
- `update_trip_total` function -- already works, trigger will cascade the recalc
