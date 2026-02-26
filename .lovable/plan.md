

# Replace Frontend Math with Backend-Computed Values

## What Changes

### 1. Refactor `FundingSummaryCard.tsx` to use pre-computed values
Currently this component receives raw `totalCost` and `memberCount` and recalculates `perPerson`, `totalRemaining`, `pctFunded`, and `deadlineDays` client-side. 

**Change**: Update the props interface to accept pre-computed backend values (`perPersonCost`, `totalRemaining`, `pctFunded`, `deadlineDays`) instead of calculating them. The parent already has these from `useTripDashboard`. Remove the local `const perPerson = totalCost / memberCount` and similar lines.

### 2. Refactor `HypeTab.tsx` to use `useTripDashboard`
Currently queries `trips` and `payments` tables directly and computes `perPersonCost = totalCost / memberCount` and `commitmentPct` client-side.

**Change**: Import and use `useTripDashboard(tripId)` instead of separate queries. Map `dashboard.current_user.share`, `.paid`, `.owe`, `dashboard.days_to_trip`, `dashboard.days_to_deadline` to replace all local math. Remove the stale `payments` and `trip` queries that duplicate what the dashboard provides.

### 3. Clean up `GroupFundingCard.tsx`
This component is no longer imported anywhere (OverviewTab and FundTab both render group funding inline using dashboard data). It can be deleted as dead code, or left as-is since it's harmless. I'll delete it to keep the codebase clean.

### 4. Ensure refetch on mutations
All mutation handlers (edit trip total, add/remove member, make payment) already call `refresh()` which invalidates the `['trip-dashboard', tripId]` query. This is already correct -- no changes needed here.

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/components/overview/FundingSummaryCard.tsx` | Replace `memberCount` prop with `perPersonCost`, `totalRemaining`, `pctFunded`, `deadlineDays` pre-computed props. Remove 4 lines of client-side math. |
| `src/components/tabs/HypeTab.tsx` | Replace direct `trips`/`payments` queries with `useTripDashboard`. Remove ~10 lines of client-side funding math. Use `dashboard.current_user.*` and `dashboard.days_to_trip`. |
| `src/components/overview/GroupFundingCard.tsx` | Delete (unused component). |

### What stays the same
- `OverviewTab.tsx` -- already fully driven by `useTripDashboard` backend values
- `FundTab.tsx` -- already fully driven by `useTripDashboard` backend values
- `PlanTab.tsx` -- already uses `useTripDashboard` for lock state
- `PersonalStatusCard.tsx` -- pure display component, receives props from dashboard, no local math
- `TripDashboard.tsx` page -- already uses `useTripDashboard`
- All refetch/invalidation logic -- already correct

