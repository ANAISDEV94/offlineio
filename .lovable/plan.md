

# Wire Create Trip to the Database

## Problem
Right now, when you create a trip, it just shows a toast and navigates to a hardcoded sample trip (`/trip/sample`). Nothing is saved to the database, so you never see your actual trip.

## What Will Change

### 1. Create Trip wizard saves to the database
- When you tap "Create Trip", the app will:
  1. Insert a new row into the `trips` table with your destination, dates, budget, vibe, etc.
  2. Insert a `trip_members` row making you the **organizer**
  3. Insert default `budget_categories` (Hotel, Flights, Activities, Food, Buffer)
  4. Navigate you to the new trip's dashboard (`/trip/<actual-trip-id>`)

### 2. Trip Dashboard fetches real data
- Instead of always showing the hardcoded sample trip, the dashboard will:
  1. Read the `tripId` from the URL
  2. Fetch the trip details from the database
  3. Fetch the trip members (with their profile names)
  4. Show a loading state while fetching, and an error if the trip isn't found

### 3. Onboarding shows your trips
- The home screen will list any trips you've already created or joined
- Each trip card shows the destination, dates, and a countdown
- Tapping a trip takes you to its dashboard
- The "Create a Trip" and "Join a Trip" options stay at the top

## Technical Details

### Files modified:
- **`src/pages/CreateTrip.tsx`** -- `handleCreate` will call `supabase.from('trips').insert(...)`, then insert the organizer into `trip_members`, then insert default budget categories, then navigate to `/trip/<new-id>`
- **`src/pages/TripDashboard.tsx`** -- Use `useParams()` to get tripId, fetch trip + members from the database with `useQuery`, show loading/error states
- **`src/components/Onboarding.tsx`** -- Fetch user's trips via `trip_members` join `trips`, display them as cards below the create/join options

### No database changes needed
The existing schema already supports everything: `trips`, `trip_members`, `budget_categories`, and `profiles` tables are all set up with proper RLS policies.

