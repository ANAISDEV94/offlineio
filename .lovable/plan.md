

# Creator-Hosted Public Trips

Add public trip hosting capability without changing the 4-tab structure. Public trips are accessed via direct link only (no marketplace).

---

## 1. Database Migration

Add new columns to the `trips` table:

```text
trips table additions:
- visibility        TEXT    NOT NULL DEFAULT 'private'
- host_bio          TEXT    NULL
- trip_description  TEXT    NULL
- max_spots         INTEGER NULL
- min_spots_required INTEGER NULL
- join_deadline     DATE    NULL
- cover_image_url   TEXT    NULL
- is_verified_host  BOOLEAN NOT NULL DEFAULT false
```

Add column to `profiles` table:

```text
profiles table addition:
- is_creator  BOOLEAN NOT NULL DEFAULT false
```

New RLS policy on `trips`:
- **"Anyone can view public trips"** -- SELECT policy: `USING (visibility = 'public')` so unauthenticated browsing is not needed but any authenticated user can see the preview.

New storage bucket `trip-covers` (public) with INSERT policy for authenticated users.

---

## 2. Create Trip Flow Updates

**File: `src/pages/CreateTrip.tsx`**

Add a new step **"Trip Type"** (step 0, shifting others forward) with progressive reveal:

- Toggle: **Private** (default) vs **Public (Creator-Hosted)**
- If Public is selected, reveal additional fields:
  - Host Name (pre-filled from profile display_name)
  - Host Bio (short textarea, max 160 chars)
  - Trip Description (textarea)
  - Max Spots (number input)
  - Min Spots Required (number, must be less than or equal to max)
  - Join Deadline (date picker)
  - Cover Image (file upload to `trip-covers` bucket)

The `handleCreate` function saves these new fields to the `trips` table and sets `is_creator = true` on the user's profile.

Step array becomes: `["Trip Type", "Destination", "Dates", "Details", "Vibe", "Budget"]`

---

## 3. Public Trip Preview Page

**New file: `src/pages/TripPreview.tsx`**

**New route: `/trip/preview/:tripId`**

Accessed via shareable link. Shows a clean, aspirational preview:

- Cover image (full-width, with gradient overlay)
- Host name + subtle "Creator Hosted" badge
- Destination + dates
- Trip vibe tags
- Estimated total per person
- Installment breakdown example (e.g., "3 payments of $733")
- Countdown to join deadline
- Spots remaining: "12 / 20 Spots Claimed"
- **"Secure Your Spot"** glass-effect CTA button

Clicking "Secure Your Spot":
- If not logged in, redirect to `/auth` with return URL
- If logged in, insert into `trip_members` (role: 'member'), insert a payment record, then navigate to `/trip/:tripId`

Layout is minimal -- single scrollable page, no tabs.

---

## 4. Shareable Link Generation

On the `TripDashboard` header, for public trips:
- Show a **"Share Trip"** button that copies the preview URL to clipboard
- URL format: `{origin}/trip/preview/{tripId}`
- Also show invite code for private sharing

---

## 5. Dashboard Enhancements for Public Trips

**File: `src/pages/TripDashboard.tsx`**

- Show cover image as header background (if available)
- Show subtle "Creator Hosted" badge + "Hosted by [Name]" below trip name
- Show spots count: "12 / 20 Spots Claimed"

---

## 6. Host Dashboard (Inside PLAN Tab)

**File: `src/components/tabs/PlanTab.tsx`**

Add a collapsible "Host Controls" section at the top of PLAN tab, visible only when `trip.created_by === user.id` AND `trip.visibility === 'public'`:

- **Participant Funding Status** -- list of members with payment %
- **Remove Member** button per member
- **Adjust Deadline** -- date picker to update `payment_deadline`
- **Send Announcement** -- text input that inserts into `notifications` for all trip members
- **Trip Health Score** -- reuse the health calculation from FundTab
- **Lock/Extend Funding Window** -- toggle or date extension

Uses a `Collapsible` component (already exists in the UI library) to keep it clean.

---

## 7. Funding Mechanics for Public Trips

**File: `src/components/tabs/UnlockTab.tsx`**

Update unlock logic for public trips:
- Check `min_spots_required` -- if set, booking unlocks only when that many members are fully funded
- If funding deadline passes and minimum not reached, show: "Trip Not Activated -- Funds Returned" (simulated for MVP)
- Otherwise, same unlock flow as private trips

**File: `src/components/tabs/FundTab.tsx`**

- Show spots progress: "8 / 12 minimum spots funded"
- If public trip with `min_spots_required`, show activation threshold in health score

---

## 8. Sample Data

Insert one sample public trip for testing (via the app, not migration):
- Host: "Maya", Destination: Tulum, Dates: June 12-16 2026
- Max spots: 12, Min required: 8, Per person: $2,200
- Visibility: public

This can be created manually through the app's create flow.

---

## Files Summary

### New files:
- `src/pages/TripPreview.tsx` -- Public trip preview page

### Modified files:
- `src/pages/CreateTrip.tsx` -- Add "Trip Type" step with progressive reveal
- `src/pages/TripDashboard.tsx` -- Cover image, host badge, share button, spots count
- `src/components/tabs/PlanTab.tsx` -- Host Controls collapsible section
- `src/components/tabs/FundTab.tsx` -- Spots progress for public trips
- `src/components/tabs/UnlockTab.tsx` -- Min spots activation logic
- `src/App.tsx` -- Add `/trip/preview/:tripId` route

### Database migration:
- Add 8 columns to `trips` table
- Add `is_creator` column to `profiles` table
- Add SELECT RLS policy for public trips
- Create `trip-covers` storage bucket with RLS

