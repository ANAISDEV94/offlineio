

# Implement Core Trip Funding Math with Server-Side Computation

## Problem

The frontend currently computes per-person shares, funded totals, and member status using client-side arithmetic scattered across multiple components. The Plan tab manually increments/decrements `trips.total_cost` when bookings are added/removed, which is fragile and can drift. There is no automatic recalculation when members join/leave.

## What Already Exists (No Changes Needed)

- **DB Views**: `trip_funding_summary` and `trip_member_funding` already compute `per_person_cost`, `total_funded`, `percent_funded`, `amount_remaining`, `member_status`, and `pct_complete` server-side from `trips.total_cost` and `payments.amount_paid`. These are well-structured and correct.
- **Tables**: `trips` (has `total_cost`, `payment_deadline`), `trip_members`, `payments`, `payment_history`, `bookings` (has `price`, `category`), `budget_categories` all exist.

## Changes

### Phase 1: Database - `recalc_trip_total` Function + Triggers

Create a Postgres function `recalc_trip_total(p_trip_id uuid)` that:
1. Computes `SELECT COALESCE(SUM(price), 0) FROM bookings WHERE trip_id = p_trip_id` 
2. Updates `trips.total_cost` to this computed sum
3. Returns the new total

Create triggers on `bookings` table for INSERT, UPDATE (of `price`), and DELETE that call `recalc_trip_total(NEW.trip_id)` (or `OLD.trip_id` for DELETE). This replaces the fragile manual `total_cost` adjustment in `PlanTab.tsx`.

No trigger on `trip_members` is needed for share recalculation because the views already compute `per_person_cost` dynamically from `total_cost / member_count` on every query.

### Phase 2: Database - `get_trip_funding_summary` RPC

Create an RPC function `get_trip_funding_summary(p_trip_id uuid)` that returns a single row from the `trip_funding_summary` view for the given trip. This gives the frontend a clean callable endpoint.

Create an RPC function `get_member_funding(p_trip_id uuid)` that returns all rows from `trip_member_funding` for the given trip. Both use `SECURITY DEFINER` with an internal membership check to enforce access control.

### Phase 3: Frontend - Wire FundTab to Server-Computed Values

**`src/components/tabs/FundTab.tsx`**:
- Replace the manual math block (lines 74-86) with a query to `trip_member_funding` view filtered by `trip_id`
- `perPersonCost` comes from the view's `per_person_cost` column
- `myPaid` comes from `amount_paid` where `user_id` matches
- `myRemaining` comes from `amount_remaining`
- `myStatus` comes from `member_status`
- `totalFunded` and `pctFunded` come from `trip_funding_summary` view
- Remove the separate `payments` query; use `trip_member_funding` for member status list
- Keep all existing UI structure and styling unchanged

### Phase 4: Frontend - Wire OverviewTab to Server-Computed Values

**`src/components/tabs/OverviewTab.tsx`**:
- Replace client-side math (lines 108-129) with queries to the two views
- Pass server-computed values to `PersonalStatusCard`, `TripHealthCard`, and the Group Funding section
- Remove the separate `payments` and `myPayment` queries; use the views instead

### Phase 5: Frontend - Remove Manual total_cost Adjustment from PlanTab

**`src/components/tabs/PlanTab.tsx`**:
- In `addBooking` mutation: remove the manual `total_cost` increment (lines 122-127). The trigger handles it.
- In `deleteBooking` mutation: remove the manual `total_cost` decrement (lines 141-145). The trigger handles it.
- After each mutation success, invalidate `["trip", tripId]` and `["trip-funding-summary", tripId]` to pick up the trigger-updated value.

### Phase 6: Frontend - TripDetailsCard Shows Computed Per-Person

**`src/components/overview/TripDetailsCard.tsx`**:
- Add optional `computedPerPerson` prop
- Display `computedPerPerson` (from the view) instead of `trip.per_person_budget` when available
- Caller (`OverviewTab`) passes the view-computed value

### Phase 7: Frontend - Organizer "Edit Trip Total" 

**`src/components/tabs/FundTab.tsx`** (organizer section):
- Add an inline edit field (visible only to organizers) that allows setting `trips.total_cost` directly
- On save, update `trips.total_cost` via supabase update, then invalidate queries
- This is the manual override; the trigger-computed value from bookings will be overwritten if the organizer edits directly, and will be re-overwritten if bookings change afterward (this is intentional -- bookings are the source of truth when they exist)

---

## Technical Details

### SQL Migration

```text
-- 1. recalc_trip_total function
CREATE OR REPLACE FUNCTION public.recalc_trip_total(p_trip_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(price), 0) INTO v_total
  FROM bookings WHERE trip_id = p_trip_id;

  UPDATE trips SET total_cost = v_total WHERE id = p_trip_id;
  RETURN v_total;
END;
$$;

-- 2. Trigger function
CREATE OR REPLACE FUNCTION public.trg_recalc_trip_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_trip_total(OLD.trip_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_trip_total(NEW.trip_id);
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Trigger on bookings
CREATE TRIGGER bookings_recalc_total
AFTER INSERT OR UPDATE OF price OR DELETE
ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_recalc_trip_total();

-- 4. RPC for trip funding summary
CREATE OR REPLACE FUNCTION public.get_trip_funding_summary(p_trip_id uuid)
RETURNS TABLE(
  trip_id uuid, trip_name text, total_cost numeric,
  member_count int, per_person_cost numeric,
  total_funded numeric, total_remaining numeric,
  percent_funded numeric, payment_deadline date,
  days_to_deadline int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM trip_funding_summary
  WHERE trip_id = p_trip_id
    AND is_trip_member(auth.uid(), p_trip_id);
$$;

-- 5. RPC for member funding
CREATE OR REPLACE FUNCTION public.get_member_funding(p_trip_id uuid)
RETURNS TABLE(
  trip_id uuid, user_id uuid, role text,
  display_name text, amount_paid numeric,
  per_person_cost numeric, amount_remaining numeric,
  member_status text, pct_complete numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM trip_member_funding
  WHERE trip_id = p_trip_id
    AND is_trip_member(auth.uid(), p_trip_id);
$$;
```

### Files Changed

| File | Change Type |
|------|------------|
| DB migration | New functions + trigger |
| `src/components/tabs/FundTab.tsx` | Replace client math with view queries; add organizer edit total |
| `src/components/tabs/OverviewTab.tsx` | Replace client math with view queries |
| `src/components/tabs/PlanTab.tsx` | Remove manual total_cost adjustment |
| `src/components/overview/TripDetailsCard.tsx` | Accept computed per-person prop |
| `src/components/overview/FundingSummaryCard.tsx` | Minor: ensure it uses passed props (already does) |

### What Does NOT Change
- No styling changes
- No new UI components
- No changes to edge functions
- No changes to auth flow
- Payment plan logic in FundTab stays as-is (it reads from the same computed values)

