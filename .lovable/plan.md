

# New Overview Tab + Private "My Trip" Portal

## What This Adds

1. **Overview Tab** (new first tab) -- A single-glance dashboard showing trip details, all members, and everyone's funding status in one place.
2. **My Trip Tab** (new tab) -- A private portal for the logged-in user showing only their own payment details, installment plan, packing list, and personal info.

The existing tabs (Fund, Plan, Unlock, Hype) remain unchanged. The tab bar becomes: **Overview | Fund | Plan | Unlock | Hype | My Trip**

---

## 1. New File: `src/components/tabs/OverviewTab.tsx`

This is the holistic "at a glance" view. It will show:

- **Trip Details Card**: Destination, dates, vibe, per-person budget, days until departure
- **Members List**: Every person on the trip with their avatar initials, name, role (organizer vs member), and a funding status badge (Paid / On Track / Behind) -- dollar amounts are NOT shown here to keep it neutral and non-invasive
- **Group Funding Summary**: A single progress bar showing total group funding percentage (e.g. "72% funded -- 5 of 7 members on track")
- **Quick Stats Row**: Total members count, days until trip, funding health score
- **Payment Deadline** (if set): Countdown card

Data sources (all already accessible via existing RLS):
- `trips` table for trip details
- `trip_members` + `profiles` for member list
- `payments` for funding summary (aggregated, no individual dollar amounts exposed)

## 2. New File: `src/components/tabs/MyTripTab.tsx`

This is the user's private portal. It queries only the current user's data:

- **My Payment Card**: Their personal amount paid, amount owed, remaining balance, percentage, installment plan, next due date, auto-pay status
- **My Packing List**: Their personal packing items (already scoped to `user_id` via RLS)
- **My Role**: Whether they're an organizer or member
- **Empty states** if no payment or packing items are set up yet

Data sources:
- `payments` filtered to `auth.uid()` (RLS already enforces this for updates; for select, all trip members can see all payments, but we filter client-side to show only the user's own)
- `packing_items` (RLS already scoped to own user)

## 3. Updated File: `src/pages/TripDashboard.tsx`

- Import `OverviewTab` and `MyTripTab`
- Change `defaultValue` from `"fund"` to `"overview"`
- Add two new tab triggers and content areas
- Tab bar order: Overview, Fund, Plan, Unlock, Hype, My Trip
- Since 6 tabs is a lot for mobile, reduce tab label text size slightly and use compact emoji+text labels

---

## No Database Changes

All the data needed already exists in the current schema. The existing RLS policies already allow trip members to view payments, members, and trip details. The private portal just filters client-side to the current user's records.

## Technical Details

### OverviewTab Data Queries
- `trips` (already cached from parent)
- `trip_members` + `profiles` join (already cached from parent)  
- `payments` aggregate (reuses existing query pattern)

### MyTripTab Data Queries
- `payments` filtered by `user_id = auth.uid()` (single row)
- `packing_items` filtered by `user_id = auth.uid()` (already RLS-scoped)

### Tab Bar Layout
With 6 tabs on mobile, each trigger will use `text-[10px]` and shorter labels:
- Overview, Fund, Plan, Unlock, Hype, Me

### Files Changed

| File | Change |
|---|---|
| `src/components/tabs/OverviewTab.tsx` | New file -- holistic trip dashboard |
| `src/components/tabs/MyTripTab.tsx` | New file -- private user portal |
| `src/pages/TripDashboard.tsx` | Add two new tabs, change default to "overview" |

