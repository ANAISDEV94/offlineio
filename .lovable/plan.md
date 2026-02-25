
# Major Refactor: 4-Pillar Architecture + UX Fixes + Visual Upgrade

This is a large overhaul touching nearly every file. Here's what changes, organized by priority.

---

## Phase 1: Critical Bug Fixes

### 1A. Fix RLS Policy for Trip Creation
The "new row violates row-level security policy for table trips" error happens because the `trips` SELECT policy uses `is_trip_member(auth.uid(), id)`, but the `trip_members` row hasn't been inserted yet when the trip is first created. The insert policy works fine, but the `.select().single()` call after insert fails because the user can't read the trip yet.

**Fix:** Insert the trip without `.select().single()`, then insert `trip_members`, then fetch the trip separately. Alternatively, restructure so the trip insert returns just the `id` using a raw RPC or by changing the flow.

**Database migration:** No schema changes needed -- the RLS policies are correct. The code just needs to stop chaining `.select()` on the insert.

### 1B. Fix Group Size Limit
Remove the `Math.min(20, ...)` cap on group size in `CreateTrip.tsx` so users can add as many people as they want.

### 1C. Fix AppTour Showing After Signup
Update `Auth.tsx` so that after signup confirmation and first login, the user is routed to `/` where the `Onboarding` component will auto-show the `AppTour` (it already does this based on `onboarding_completed: false`). The flow already works -- the issue is just that email confirmation redirects to `/auth` which then navigates to `/` on successful session detection.

---

## Phase 2: Create Trip UX Improvements

### 2A. Destination Autocomplete
Replace the plain text input with a searchable combobox (using the existing `cmdk` / `Command` component already installed) that queries a static list of world cities/countries. Since we don't want an external API dependency, we'll embed a curated list of ~500 popular destinations (city + country) and filter client-side as the user types.

**New file:** `src/lib/destinations.ts` -- a static array of `{ city, country, emoji }` entries covering all continents.

**Changes to `CreateTrip.tsx`:** Replace the destination `Input` with a `Popover` + `Command` combo that filters the list as you type, showing results like "Rome, Italy" with flag emojis.

### 2B. Multi-Select Vibe Picker
Change the vibe step from single-select to multi-select. Update the `form.vibe` state from a string to a `string[]`. The selected vibes will be joined with commas when saved to the database (the `vibe` column is already `text` type, so comma-separated works fine).

### 2C. Fix "Soft Life" Vibe
Change the Soft Life option from `🧘‍♀️` to `🧖‍♀️` (spa/pampering emoji) and keep the label as "Soft Life".

### 2D. Add Back Button to Wizard Steps
Add a "Back" button next to the "Next" button at the bottom of each step (not just the arrow in the header). The first step won't show a Back button.

---

## Phase 3: 4-Pillar Navigation Refactor

Restructure the 6 tabs (Plan, Pay, Book, Pack, Fits, Hype) into 4 tabs:

| New Tab | Contains | Old Tabs |
|---------|----------|----------|
| **FUND** | Payment tracking, installment plans, trip health score, escrow badge, no-drama mode | Pay |
| **PLAN** | Trip templates, budget breakdown, day-by-day itinerary | Plan |
| **UNLOCK** | Locked booking gate (unlocks at 100% funded), flights/hotels/experiences | Book |
| **HYPE** | Countdown, hype messages, outfit board (Fits), packing checklist (Pack) | Hype + Fits + Pack |

### 3A. FUND Tab (New `src/components/tabs/FundTab.tsx`)
- Large circular progress indicator (SVG ring) showing % funded, total funded, total goal
- Member funding cards with name, % complete, status badge ("On Track" / "Behind" / "Paid in Full")
- Trip Health Score (0-100%) based on % funded, % members on schedule, days remaining
- Installment plan selector (Weekly, Biweekly, Monthly, Custom)
- Funding deadline countdown ("12 days until funding deadline")
- Escrow Protection Badge with tooltip
- "No-Drama Mode" toggle that hides dollar amounts and shows only percentages

### 3B. PLAN Tab (Updated `src/components/tabs/PlanTab.tsx`)
- Trip Type Templates section at top (Soft Girl Summer, Birthday Reset, Bachelorette Energy, Girls Gone Global, Healing Escape)
- Selecting a template auto-suggests budget ranges and itinerary structure
- Keep existing budget breakdown and itinerary features
- Clean, calm layout

### 3C. UNLOCK Tab (New `src/components/tabs/UnlockTab.tsx`)
- Check trip funding percentage from payments data
- If < 100%: show locked state with message and progress
- If = 100%: unlock with confetti animation, show Flights/Hotels/Experiences sections
- Reuse booking add/view logic from current BookTab

### 3D. HYPE Tab (Updated `src/components/tabs/HypeTab.tsx`)
- Countdown section (keep existing)
- Outfit Board section (merge FitsTab content including photo uploads)
- Packing Checklist section (merge PackTab content)
- Keep visually playful

### 3E. Update `TripDashboard.tsx`
- Replace 6 tabs with 4: FUND, PLAN, UNLOCK, HYPE
- Update tab icons and labels

---

## Phase 4: Outfit Photo Uploads

### 4A. Enable File Upload in FitsTab (now inside HypeTab)
- Use the existing `outfits` storage bucket (already public)
- Add a file input that uploads to `outfits/{tripId}/{userId}/{filename}`
- After upload, get the public URL and insert into `outfit_posts`
- Add occasion selector (Dinner, Beach, Night Out, Airport) and caption input

**Database migration:** Add storage RLS policies for the `outfits` bucket so authenticated trip members can upload.

---

## Phase 5: Visual Upgrade -- Girly Glass Aesthetic

### 5A. Glassmorphism Utility Classes
Add glass effect CSS classes to `index.css`:
- `.glass` -- `backdrop-blur-xl bg-white/40 border border-white/20 shadow-lg`
- `.glass-card` -- same with rounded corners

### 5B. Apply Glass Effects
- Onboarding CTA cards (Create Trip, Join Trip) -- glass effect
- Dashboard tab bar -- glass effect
- Buttons on key actions -- glass border + blur background
- AppTour slides -- glass card styling

### 5C. Enhanced Color Palette
- Slightly richer gradients
- More prominent use of lavender, blush, peach, mint
- Subtle gradient backgrounds on cards
- Softer shadows with color tinting

### 5D. Typography & Spacing
- More generous spacing between sections
- Consistent rounded-2xl on all cards
- Subtle hover animations on interactive elements

---

## Phase 6: Update AppTour for New 4-Tab Structure

Update the tour slides to reflect the new FUND / PLAN / UNLOCK / HYPE structure instead of the old 6 tabs.

---

## Files Summary

### New files:
- `src/lib/destinations.ts` -- Static destination list (~500 cities)
- `src/components/tabs/FundTab.tsx` -- FUND tab component
- `src/components/tabs/UnlockTab.tsx` -- UNLOCK tab component

### Modified files:
- `src/pages/CreateTrip.tsx` -- Autocomplete destination, multi-select vibe, back button, RLS fix, no group size cap
- `src/pages/TripDashboard.tsx` -- 4-tab navigation, glass styling
- `src/components/tabs/PlanTab.tsx` -- Add trip templates section
- `src/components/tabs/HypeTab.tsx` -- Merge Fits + Pack content into sections
- `src/components/Onboarding.tsx` -- Glass effect on CTA cards
- `src/components/AppTour.tsx` -- Update slides for 4-tab structure, glass styling
- `src/lib/sample-data.ts` -- Update vibeOptions (soft life emoji, multi-select support)
- `src/index.css` -- Glass utility classes, enhanced gradients

### Database migration:
- Storage RLS policies for `outfits` bucket (INSERT/SELECT for authenticated users)

### Removed from primary navigation (merged into HYPE):
- `src/components/tabs/FitsTab.tsx` -- Content merged into HypeTab
- `src/components/tabs/PackTab.tsx` -- Content merged into HypeTab
- `src/components/tabs/PayTab.tsx` -- Replaced by FundTab

(These files stay in the repo but are no longer imported by TripDashboard)
