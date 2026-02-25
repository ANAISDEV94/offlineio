

# Comprehensive App Overhaul

This is a large set of improvements broken into 6 phases, each building on the previous.

---

## Phase 1: Fix Authentication (Critical)

**Problem**: Login credentials aren't storing/working. Users can't sign in.

**Root Cause**: Email confirmation is required but users aren't confirming. We need to enable auto-confirm so users can sign in immediately after signup.

**Changes**:
- Enable auto-confirm for email signups via the auth configuration tool
- The existing Auth.tsx code is functional -- the blocker is the email verification step

---

## Phase 2: Stripe Payment Integration

**Problem**: Users need to make real payments, not just track amounts.

**Changes**:
- Enable Stripe integration (will prompt for secret key)
- Create a payment edge function that creates Stripe Checkout sessions for trip payments
- Add a "Make Payment" button in the Fund tab for each user's own payment
- Payment details (card info) remain private -- only payment progress (amount paid vs owed) is visible to other members
- After successful Stripe payment, update the `payments` table `amount_paid` field via a webhook

**New files**:
- `supabase/functions/create-checkout/index.ts` -- creates Stripe checkout session
- `supabase/functions/stripe-webhook/index.ts` -- handles payment confirmation

**Modified files**:
- `src/components/tabs/FundTab.tsx` -- add "Pay Now" button for current user's row
- New component for payment flow

---

## Phase 3: Templates During Trip Creation

**Problem**: Templates only appear in the Plan tab after trip creation. They should be available during creation to pre-fill everything.

**Changes**:
- Move trip templates to step 0/1 of the CreateTrip wizard as a "Start from Template" option
- Each template gets a distinct background/theme color and pre-fills: budget range, vibe, suggested itinerary structure, and group size
- Templates become "plug and play" -- select one and fields auto-populate
- Remove templates from PlanTab (they're no longer needed there)

**Template examples with visual themes**:
| Template | Background | Budget | Vibes |
|---|---|---|---|
| Soft Girl Summer | Pink gradient | $2,500-4,000 | Beach, brunch, sunsets |
| Birthday Reset | Gold/champagne | $3,000-5,000 | VIP, spa, nightlife |
| Bachelorette Energy | Hot pink | $2,000-4,500 | Pool party, matching outfits |
| Girls Gone Global | Blue/teal | $4,000-7,000 | Culture, food tours |
| Healing Escape | Green/sage | $2,000-3,500 | Yoga, nature, journaling |

**Modified files**:
- `src/pages/CreateTrip.tsx` -- add template selection as first step with visual cards
- `src/components/tabs/PlanTab.tsx` -- remove template section

---

## Phase 4: Merge "Me" Tab into Overview + Make Everything Editable

**Problem**: "Me" tab is separate but should be in Overview. Tabs aren't editable.

**Changes**:

**Dashboard restructure** (remove "Me" tab):
- Move "My Payment", "My Role", and "My Packing List" cards into the Overview tab (below the Members card)
- Add a Settings section in Overview (sign out, profile name edit)
- Tab bar becomes: Overview, Fund, Plan, Unlock, Hype (5 tabs)

**Make content editable throughout**:
- **Itinerary (Plan tab)**: Add edit/delete buttons on each itinerary item. Tap to edit activity, time, or notes inline
- **Budget categories (Plan tab)**: Add edit/delete for each category. Allow changing amounts and spent values
- **Bookings (Unlock tab)**: Add edit/delete for each booking
- **Packing items (Hype tab)**: Add delete button (swipe or X icon)
- **Outfit posts (Hype tab)**: Add delete for own posts
- **Members (Overview)**: "No Plan" badge becomes clickable -- tapping it on the organizer's view opens a prompt to set up that member's payment plan

**Modified files**:
- `src/pages/TripDashboard.tsx` -- remove "Me" tab
- `src/components/tabs/OverviewTab.tsx` -- add My Payment, My Role, Packing List, Settings
- `src/components/tabs/PlanTab.tsx` -- add edit/delete to itinerary items and budget categories
- `src/components/tabs/UnlockTab.tsx` -- add edit/delete to bookings
- `src/components/tabs/HypeTab.tsx` -- add delete to packing items and outfit posts
- `src/components/overview/MembersCard.tsx` -- make "No Plan" badge clickable

---

## Phase 5: Fix Itinerary Time Display

**Problem**: Time isn't showing in itinerary items.

**Root cause**: The time input is a plain text field (`<Input placeholder="Time">`). When users type "10am" or "2:00 PM", it saves as text but shows as a dash if empty.

**Fix**:
- Change the time input to `type="time"` for proper time picker UX
- Display saved times formatted nicely (e.g., "10:00 AM") instead of raw strings
- Show the time prominently in the itinerary card (it currently shows but as "---" if null)

**Modified files**:
- `src/components/tabs/PlanTab.tsx` -- change input type, format display

---

## Phase 6: Outfit Board UX Cleanup

**Problem**: The outfit board is confusing. The caption flow and upload process aren't intuitive.

**Changes**:
- Restructure the upload flow: tap "Post Your Outfit" opens a full upload card with:
  1. Image preview area (tap to select photo)
  2. Occasion selector (dinner, beach, night out, airport)
  3. Optional caption field
  4. Post button
- Currently the occasion and caption fields sit above the upload button which is backwards -- you should pick the image first, then add details
- Add the ability to react with emojis (tap heart to add reaction)
- Add delete capability for own outfit posts
- Better empty state messaging

**Modified files**:
- `src/components/tabs/HypeTab.tsx` -- restructure outfit upload flow, add reactions and delete

---

## Database Changes Needed

1. **Auth**: Enable auto-confirm email signups
2. **Stripe**: New edge functions for checkout and webhooks (no schema changes -- payments table already exists)
3. **Bookings**: Add UPDATE policy so creators can edit their own bookings
4. **Budget**: Existing policies already allow organizer CRUD
5. **Itinerary**: Existing policies already allow member CRUD

```sql
-- Allow users to update their own bookings
CREATE POLICY "Users can update own bookings"
ON public.bookings FOR UPDATE
USING (auth.uid() = created_by);
```

---

## Summary of Tab Changes

| Before | After |
|---|---|
| Overview, Fund, Plan, Unlock, Hype, Me | Overview, Fund, Plan, Unlock, Hype |

**Overview tab now includes**: Trip details, invite code, group funding, budget alert, members, MY payment status, MY role, MY packing list, settings/sign out

---

## Implementation Order

1. Fix auth (unblocks everything)
2. Enable Stripe (requires user's secret key)
3. Templates in creation wizard
4. Merge Me tab + make everything editable
5. Fix time display
6. Outfit board UX

Each phase will be implemented sequentially, with testing between phases.

