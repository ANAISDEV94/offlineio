

# End-to-End Fix: Make Everything Work

## Issues Found

### 1. "Let's Go" button does nothing (Critical)
The AppTour's `onComplete` callback calls `setShowTour(false)`, but `showTour` is already `false` when the tour auto-shows. The auto-show condition (`shouldShowTour`) stays true because the cached profile query still has `onboarding_completed: false`. The database update happens but the UI never refreshes.

**Fix:** Add a local `dismissed` state in Onboarding and invalidate the profile query cache when the tour completes, so the overlay actually disappears.

### 2. All dashboard tabs show hardcoded sample data
PlanTab, PayTab, BookTab, PackTab, and FitsTab all import from `sample-data.ts` instead of fetching real trip data from the database. When you create a trip and land on its dashboard, every tab shows fake Italian trip data instead of your actual trip.

**Fix:** Pass the `tripId` prop to each tab component and have them fetch real data from the database. Show empty states with "add" actions when there's no data yet (which is the normal state for a freshly created trip).

### 3. Join Trip flow is hardcoded
The "Join" button navigates to `/trip/sample` instead of looking up the invite code in the database.

**Fix:** Query the `trips` table by `invite_code`, add the user as a `trip_member`, then navigate to the real trip.

## Changes

### File: `src/components/Onboarding.tsx`
- Add a `dismissed` state variable that starts as `false`
- When AppTour completes, set `dismissed` to `true` AND invalidate the `profile-onboarding` query
- Update the tour visibility condition to also check `!dismissed`
- Fix Join Trip to query by `invite_code` from the `trips` table, insert into `trip_members`, and navigate to the matched trip

### File: `src/components/AppTour.tsx`
- Accept an optional `onComplete` callback (already does) -- no changes needed here

### File: `src/pages/TripDashboard.tsx`
- Pass `tripId` as a prop to all six tab components

### File: `src/components/tabs/PlanTab.tsx`
- Accept `tripId` prop
- Fetch `itinerary_items` and `budget_categories` from the database for this trip
- Show empty states with "Add" buttons when no data exists
- Allow adding itinerary items and editing budget categories

### File: `src/components/tabs/PayTab.tsx`
- Accept `tripId` prop
- Fetch `payments` and `trip_members` (with profiles) from the database
- Show real payment status per member instead of sample data
- Keep the organizer toggle and nudge functionality

### File: `src/components/tabs/BookTab.tsx`
- Accept `tripId` prop
- Fetch `bookings` from the database for this trip
- Show empty state with an "Add Booking" form
- Allow adding new bookings (flights, hotels, activities)

### File: `src/components/tabs/PackTab.tsx`
- Accept `tripId` prop
- Fetch `packing_items` from the database for the current user and trip
- Persist checkbox state to the database
- Allow adding new items that save to the database

### File: `src/components/tabs/FitsTab.tsx`
- Accept `tripId` prop
- Fetch `outfit_posts` and `outfit_reactions` from the database
- Show empty state until outfits are posted

### File: `src/components/tabs/HypeTab.tsx`
- Accept `tripId` prop
- Calculate countdown based on real trip dates (already received from parent)
- Fetch `notifications` from the database

## Technical Notes

- All tab queries use `useQuery` with `tripId` in the query key for proper caching
- Empty states use friendly copy and "Add" CTAs so a freshly created trip feels useful, not broken
- The `sample-data.ts` imports will be removed from all tab components
- No database schema changes needed -- all tables already exist with proper RLS policies
