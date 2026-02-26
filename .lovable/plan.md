

# Rebrand Trip Planner and Show Content Only After Planning

## What Changes

Two focused changes to make the experience feel seamless and not "AI-powered":

### 1. Rename "AI Trip Planner" to "Trip Planner"

Remove all AI branding from the planner component and entry point.

**Files affected:**
- `src/components/AiTripPlanner.tsx` -- SheetTitle: "AI Trip Planner" becomes "Trip Planner", remove Sparkles icon reference in title
- `src/components/tabs/PlanTab.tsx` -- Entry card subtitle: remove "AI generates your budget + itinerary", replace with something like "Answer a few questions and we'll build your budget + itinerary". Also rename the "AI Draft Plan" label to "Draft Plan"

### 2. Hide "What We're Booking" and "Itinerary" sections until the Trip Planner populates them

Currently these sections always render (with lock overlays or empty states). Instead:

- **"What We're Booking" section** (lines 459-550): Only render when there are actual bookings OR draft plan items with budget data. If no plan has been created yet, hide entirely.
- **"Itinerary" section** (lines 552-629): Only render when there are actual itinerary items OR draft itinerary items. If nothing exists, hide entirely.
- **Funding gate banner** (lines 331-367): Keep this -- it still communicates the funding milestone. But the locked category cards beneath it go away.
- **Organizer booking cards**: Still only appear when fully funded AND there are bookings to manage.

The flow becomes:
1. User opens Plan tab -- sees Trip Planner entry card + funding banner (if not fully funded). No empty booking/itinerary sections.
2. User runs Trip Planner -- draft items are saved.
3. Draft items now populate the "What We're Booking" and "Itinerary" sections, which become visible.
4. Once approved/finalized, these become the real plan.

**File affected:**
- `src/components/tabs/PlanTab.tsx` -- Wrap the bookings-by-category block and itinerary block in conditionals that check for content existence.

---

## Technical Details

### PlanTab.tsx changes

**Conditionals for showing sections:**
```
const hasBookings = bookings.length > 0;
const hasDraftBudget = draftBudgetItems.length > 0;
const hasItinerary = Object.keys(days).length > 0;
const hasDraftItinerary = draftItineraryItems.length > 0;

// Only show "What We're Booking" when there's content
const showBookingSection = hasBookings || hasDraftBudget;

// Only show "Itinerary" when there's content  
const showItinerarySection = hasItinerary || hasDraftItinerary;
```

- Wrap the entire "What We're Booking" div (lines 459-550) with `{showBookingSection && (...)}`.
- Wrap the entire "Itinerary" div (lines 552-629) with `{showItinerarySection && (...)}`.
- The locked category cards with "No bookings yet" and lock icons are removed from the default empty state.

### AiTripPlanner.tsx changes

- Line 185: Change `"AI Trip Planner"` to `"Trip Planner"`
- Line 260: Change description text removing "AI" references
- Entry card in PlanTab (line 259-260): Update copy to remove "AI" wording

### PlanTab.tsx label changes

- Line 271: "AI Draft Plan" becomes "Draft Plan"
- Line 259: "Plan this trip for me" stays (no AI mention)
- Line 260: Change "Answer a few questions and AI generates your budget + itinerary" to "Answer a few questions and we'll build your budget + itinerary"

