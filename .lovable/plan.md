

# Replace Hype Tab with Settings Tab + Enhance Overview Payment Visibility

## Summary

Three changes requested:
1. **Organizer can edit the total amount due** -- already exists in the Fund tab but needs to be more prominent and also accessible from the Overview tab
2. **Replace Hype tab with a full Settings/Profile tab** -- covering display name, email, password change, sign out, and payment history
3. **Overview dashboard shows who has paid and who hasn't** -- add a visible member payment status list directly in the Overview tab

---

## Change 1: Enhance Organizer "Edit Trip Total" Visibility

**File: `src/components/tabs/OverviewTab.tsx`**
- Add an inline "Edit Trip Total" card (organizer-only) in the Overview tab, between Trip Health and Personal Status cards
- Uses the same pattern already in FundTab: pencil icon to toggle edit mode, input field, save/cancel buttons
- On save, updates `trips.total_cost` and invalidates funding queries

**File: `src/components/tabs/FundTab.tsx`**
- Move the organizer "Edit Trip Total" card from the middle of Group Funding section to the very top of the Fund tab (above "Your Responsibility") so it's the first thing the organizer sees

---

## Change 2: Replace Hype Tab with Settings/Profile Tab

**File: `src/components/tabs/SettingsTab.tsx`** (NEW)
- Full user profile and account management tab containing:
  1. **Profile Section**: Display name (editable), email (read-only, from `user.email`), avatar
  2. **Security Section**: Change password (calls `supabase.auth.updateUser({ password })`), with current password not required by Supabase for logged-in users
  3. **Payment Information**: Personal payment history log (from `payment_history` table)
  4. **Account Actions**: Sign out button
- All data comes from existing `profiles` table and `auth.user` object -- no new tables needed

**File: `src/pages/TripDashboard.tsx`**
- Replace `HypeTab` import with `SettingsTab` import
- Rename the 4th tab from "Hype" to "Settings" with a gear icon
- Tab values: overview, fund, plan, settings

**File: `src/components/tabs/OverviewTab.tsx`**
- Remove the Settings card at the bottom (display name edit + sign out) since it moves to the dedicated Settings tab

---

## Change 3: Show Member Payment Status in Overview Dashboard

**File: `src/components/tabs/OverviewTab.tsx`**
- In the "Group Funding" card (currently shows only percentage + status count badges), add a member-by-member status list below the progress bar
- Each member row shows: name, status badge (Paid / On Track / Behind), and for organizers only, the dollar amounts (amount paid / share)
- Uses the existing `memberFunding` query data already loaded in the component
- This replaces the sparse "X Paid, Y On Track, Z Behind" summary with an actual visible list

**File: `src/components/overview/MembersCard.tsx`**
- Ensure the existing status badges in the Members card also reflect the `memberFunding` data consistently (already wired, no change needed)

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/tabs/SettingsTab.tsx` | NEW -- full profile/security/payment settings tab |
| `src/pages/TripDashboard.tsx` | Replace Hype tab with Settings tab |
| `src/components/tabs/OverviewTab.tsx` | Add organizer edit total card; add member payment status list; remove bottom settings section |
| `src/components/tabs/FundTab.tsx` | Move edit total to top for organizer prominence |

## No Database Changes Required

All data sources already exist:
- `profiles` table for display name
- `auth.user` for email
- `supabase.auth.updateUser()` for password changes
- `payment_history` table for transaction log
- `trip_member_funding` view for member payment status
- `trip_funding_summary` view for totals

