

# Connect Trip Screens to a Single `get_trip_dashboard` Backend Function

## Summary

Create a consolidated backend function `get_trip_dashboard(trip_id)` that returns all computed dashboard data in one call, plus mutation functions `update_trip_total`, `create_contribution` (edge function for Stripe), and `set_member_share_override`. Then refactor the three tab components to consume this single data source instead of querying multiple tables/views independently.

---

## Step 1: Database -- Create `get_trip_dashboard` Function

A new PostgreSQL function that returns a JSON object combining data from `trip_funding_summary`, `trip_member_funding`, `trips`, and `user_payment_methods`. It requires the caller to be a trip member (via `is_trip_member`).

**Returned shape:**
```text
{
  trip_id, trip_name, destination, start_date, end_date, vibe,
  cover_image_url, visibility, invite_code, created_by,
  total_cost, per_person_cost (default_share), funded_total, remaining_total,
  funded_percent (0-1 scale), payment_deadline, days_to_deadline, days_to_trip,
  health_score, health_label,
  current_user: { user_id, role, display_name, share, paid, owe, status, has_payment_method },
  members: [{ user_id, display_name, role, share, paid, remaining, status, pct_complete }]
}
```

Health score is computed server-side using the same weighted formula currently in `funding-utils.ts` (40% funded, 30% on-track members, 20% deadline buffer, 10% late penalty).

## Step 2: Database -- Create `update_trip_total` Function

A `SECURITY DEFINER` function: `update_trip_total(p_trip_id uuid, p_total numeric)`.
- Checks `is_trip_organizer(auth.uid(), p_trip_id)` and raises exception if not.
- Updates `trips.total_cost`.
- Returns the new total.

## Step 3: Database -- Create `set_member_share_override` Function + Table

**New table: `member_share_overrides`**
- `trip_id` (uuid), `user_id` (uuid), `share_amount` (numeric), `set_by` (uuid), `created_at`
- Unique on (trip_id, user_id)
- RLS: organizers can insert/update/delete; members can view their own row

**Function: `set_member_share_override(p_trip_id, p_user_id, p_amount)`**
- Organizer-only. Upserts into `member_share_overrides`.
- The `get_trip_dashboard` function and `trip_member_funding` view will check for overrides: if a row exists in `member_share_overrides` for that member, use `share_amount` instead of `total_cost / member_count`.

**Adjust `trip_member_funding` view** to incorporate overrides so `per_person_cost` reflects the override when present.

## Step 4: Edge Function -- `create-contribution`

A new edge function (or rename existing `create-checkout`) that:
- Accepts `{ trip_id, amount }` (amount in dollars)
- Validates the user is a trip member
- Creates a Stripe Checkout session via the existing Stripe integration
- Returns `{ url }` for redirect (current flow) or `{ client_secret }` if using Payment Intents
- The current `create-checkout` already does this; we alias/rename or keep it and add a thin wrapper

Since `create-checkout` already exists and works, we will keep it and just ensure the frontend calls it correctly. No new edge function needed.

## Step 5: Create a Custom Hook -- `useTripDashboard(tripId)`

**New file: `src/hooks/useTripDashboard.ts`**

Calls `supabase.rpc('get_trip_dashboard', { p_trip_id: tripId })` via `useQuery`. Returns the full dashboard object typed as `TripDashboard`. All tabs import this single hook instead of querying multiple tables.

## Step 6: Refactor `OverviewTab.tsx`

Remove all individual queries (trip, members, fundingSummary, memberFunding, myProfile). Replace with:
```
const { data: dashboard } = useTripDashboard(tripId);
```

Map dashboard fields to existing card components:
- `TripHealthCard`: `dashboard.health_score`, `dashboard.health_label`, `dashboard.days_to_trip`, `dashboard.days_to_deadline`
- `PersonalStatusCard`: `dashboard.current_user.share`, `.paid`, `.owe`, `dashboard.payment_deadline`, `.status`
- Group Funding card: `dashboard.funded_percent`, `dashboard.funded_total`, `dashboard.remaining_total`, member counts from `dashboard.members`
- `TripDetailsCard`: `dashboard.destination`, dates, vibe, `dashboard.per_person_cost`
- Members list: `dashboard.members` array
- Edit Trip Total: calls `supabase.rpc('update_trip_total', ...)`, then invalidates `['trip-dashboard', tripId]`

## Step 7: Refactor `FundTab.tsx`

Replace individual queries with `useTripDashboard(tripId)`. Map:
- Payment Summary: `dashboard.current_user.share/paid/owe/status`
- Group Funding: `dashboard.funded_percent/funded_total`
- Payment form: keeps calling `create-checkout` edge function, then invalidates dashboard query
- Add "Payment method on file" indicator: `dashboard.current_user.has_payment_method`
- Edit Trip Total (organizer): calls `update_trip_total` RPC

Keep `payment_history` and `payments` (installment plan) as separate queries since they are user-specific detail not in the dashboard payload.

## Step 8: Refactor `PlanTab.tsx`

Replace funding summary query with `useTripDashboard(tripId)`:
- Lock state: `dashboard.funded_percent < 1` (note: backend returns 0-1 scale)
- Keep `bookings` and `itinerary_items` queries as-is (not part of dashboard)
- Host Controls member list: use `dashboard.members` instead of separate member+profile+payment queries
- Add share override UI for organizers: per-member input calling `set_member_share_override`

## Step 9: Refactor `TripDashboard.tsx` (page header)

Replace individual trip/members/hostProfile queries with `useTripDashboard(tripId)` for the header section (trip name, destination, days until, member avatars, spots claimed).

---

## Files Changed

| File | Change |
|------|--------|
| DB migration | Create `get_trip_dashboard` function, `update_trip_total` function, `member_share_overrides` table + RLS, `set_member_share_override` function, update `trip_member_funding` view |
| `src/hooks/useTripDashboard.ts` | NEW -- custom hook wrapping the RPC call |
| `src/components/tabs/OverviewTab.tsx` | Refactor to use `useTripDashboard` |
| `src/components/tabs/FundTab.tsx` | Refactor to use `useTripDashboard`, add payment method indicator |
| `src/components/tabs/PlanTab.tsx` | Refactor lock state + host controls to use `useTripDashboard`, add share override UI |
| `src/pages/TripDashboard.tsx` | Refactor header to use `useTripDashboard` |
| `src/lib/funding-utils.ts` | Keep as fallback types only; server now computes health |

