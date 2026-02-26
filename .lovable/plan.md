
# Product Architecture Overhaul: Financial Coordination System

## Summary
Restructure the entire dashboard from a "group travel inspiration board" into a **structured group financial accountability platform**. This touches every tab, the role permission model, and the visual hierarchy.

---

## Phase 1: Role Permission Architecture (Prompt 1)

### Current State
- `trip_members.role` already stores `organizer` or `member`
- `is_trip_organizer()` and `is_trip_member()` DB functions exist
- Organizer actions are scattered inconsistently across tabs

### Changes

**A. New shared hook: `src/hooks/useTripRole.ts`**
- Returns `{ isOrganizer, isMember, role }` for the current user and trip
- Single source of truth, replaces ad-hoc `isOrganizer` checks in OverviewTab, PlanTab, FundTab

**B. Enforce role-gated UI consistently**
- **Organizer-only actions** (gated behind `isOrganizer`):
  - Set/edit total cost and per-person share
  - Set/extend payment deadlines
  - Remove members
  - View full payment ledger (dollar amounts per member)
  - Adjust plans and budget categories
  - Toggle "No-Drama Mode" for the group
- **Member-only view**:
  - Total trip amount (read-only)
  - Their required share (read-only)
  - Their personal contribution history
  - Their remaining balance
  - Can only pay for themselves
  - Cannot see others' dollar amounts (unless organizer enables transparency)

**C. Shared Group Dashboard section** (visible to all):
  - Total trip cost
  - Total funded (percentage)
  - Remaining balance (percentage)
  - Countdown to deadline
  - Member status: Paid / Partial / Not Paid (status badges only, no dollar amounts by default)

---

## Phase 2: No-Drama Mode as Core Feature (Prompt 2)

### Current State
- No-Drama Mode is a small toggle at the bottom of FundTab with minimal effect (hides dollar amounts in member list)

### Changes

**A. Elevate No-Drama Mode to a prominent system-level feature**
- Move from a hidden toggle to a **visible badge in the trip header** (`TripDashboard.tsx`)
- Display: `No-Drama Mode: ON` badge near the trip name
- When ON (default for all trips):
  - Automatic deadline reminders at 14, 7, 3, 1 days (already partially implemented)
  - Late payer visual warnings (amber/red status badges)
  - Organizer gets "Remove Member" or "Extend Deadline" action buttons on overdue members
  - Auto-recalculation of per-person share when a member is removed

**B. Add visible system rule card**
- New card in Overview: "If a member does not meet their payment deadline, the organizer can remove them and auto-adjust the per-person share."
- This makes the enforcement mechanism transparent and impersonal

**C. Anti-drama messaging**
- Rewrite copy throughout to emphasize: "The system enforces fairness" (not the organizer)
- Deadline reminders use neutral, structured language

---

## Phase 3: Fund Tab Redesign (Prompt 4)

### Current State
- Progress ring at top, contribution field, payment plan, member list mixed together
- No clear separation between group vs personal responsibility

### Changes

**A. Top Section: "Your Responsibility" (personal, always visible)**
- Card showing:
  - Total Trip Cost (read-only)
  - Your Share: $X
  - You Have Paid: $X
  - You Still Owe: $X
  - Deadline: MMM d, yyyy
  - Clear warning: "What happens if I don't pay?" (links to system rule)

**B. Middle Section: "Group Funding" (shared view)**
- Group progress bar (percentage only by default)
- Member payment status list showing ONLY status badges (Paid / Partial / Not Paid)
- Dollar amounts shown only if organizer enables transparency mode
- Trip Health score card (retained, refined)

**C. Bottom Section: "Make a Payment" (personal action)**
- Payment input field
- "Submit Payment" button (renamed from "Contribute")
- Contribution history log (personal only)

**D. Payment Plan section stays** but moves under "Your Responsibility"

---

## Phase 4: Hype Tab Redesign (Prompt 3)

### Current State
- Countdown, timeline, outfit board, packing checklist all mixed together
- Decorative, no clear purpose

### Changes

**A. Restructure into 3 purpose-driven sections:**

1. **Commitment Layer** (top)
   - Countdown to trip
   - "You've invested $X" personal stat
   - "You are X% committed" progress indicator

2. **Social Momentum Layer** (middle)
   - Member status grid with icons:
     - Check: Paid
     - Hourglass: Partial
     - Warning: Needs Action
   - No dollar amounts, just visual accountability

3. **Trip Prep Layer** (bottom, visually separated)
   - Outfit board (keep existing)
   - Packing checklist (keep existing)
   - Clear visual divider labeled "Trip Prep" to separate from financial sections

**B. Remove timeline/notifications section from Hype** (move to Overview if needed)

---

## Phase 5: Plan Tab Restructure (Prompt 6)

### Current State
- Budget breakdown, itinerary, host controls all in one tab
- Budget categories are disconnected from actual trip cost

### Changes

**A. Restructure hierarchy: Plan = What We're Booking**
- Sections:
  1. Flights
  2. Stay (renamed from Hotels)
  3. Experiences
  4. Shared Costs (new category)
  5. Buffer (new category)

**B. Connect Plan to Fund**
- Each booking displays: Cost, Who it applies to (All / Specific members), Paid/Unpaid status
- When a booking is added with a price, it auto-updates `trips.total_cost` via a mutation
- Budget categories feed directly into total trip cost calculation
- Remove the separate "Budget Breakdown" section; merge into the booking categories

**C. Host Controls stay** but are simplified:
  - Remove member (with auto-share recalculation)
  - Adjust deadline
  - Send announcement

---

## Phase 6: Trip Health Score (Prompt 5)

### Current State
- Basic health score exists in FundTab using a simple formula

### Changes

**A. Refined Trip Health calculation:**
```
healthScore = (pctFunded * 0.4) + (pctMembersOnTrack * 0.3) + (deadlineBuffer * 0.2) + (latePaymentPenalty * 0.1)
```

**B. Trip Health statuses with clear labels:**
- >= 80: "Healthy" (green)
- 60-79: "At Risk" (amber)
- 40-59: "Needs Action" (orange)
- < 40: "Critical" (red)

**C. Overdue member handling:**
- System auto-flags: Warning badge "Payment overdue" on member card
- Organizer sees action buttons: "Remove Member" or "Extend Deadline"
- On member removal: auto-recalculate per-person share for remaining members

**D. Move Trip Health to a prominent position** in the Overview tab header area

---

## Phase 7: Overview Tab Cleanup (Prompt 1 + 7)

### Current State
- FundingSummaryCard, TripDetails, InviteCode, BudgetAlert, PaymentDeadline, Members, Packing, Settings all in one scroll

### Changes

**A. Restructure Overview into clear hierarchy:**
1. **Trip Health + Status** (top) - health score, countdown, deadline
2. **Your Status** - personal share, paid, remaining (compact card)
3. **Group Status** - total funded %, member status badges
4. **Trip Details** - destination, dates, vibe
5. **Members** - list with status badges and organizer actions
6. **System Rules** - No-Drama Mode card with enforcement rules
7. **Settings** - display name, sign out (bottom)

**B. Remove from Overview:**
- Full FundingSummaryCard (too detailed for overview; detailed view lives in Fund tab)
- Packing list (moved to Hype/Trip Prep)

---

## Phase 8: Tab Consolidation

### Current 5 tabs: Overview, Fund, Plan, Unlock, Hype

### New 4 tabs:
1. **Overview** - Trip health, personal status, group status, members, settings
2. **Fund** - Personal responsibility, group funding progress, payment actions, history
3. **Plan** - Bookings (Flights, Stay, Experiences, Shared Costs, Buffer) + Host Controls
4. **Hype** - Commitment stats, social momentum, outfit board, packing

### Unlock tab removal:
- Merge unlock/lock status into Plan tab as a gate header
- If trip is not fully funded, Plan shows bookings as read-only with a locked overlay
- Remove dedicated Unlock tab to reduce cognitive overhead

---

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useTripRole.ts` | NEW - shared role hook |
| `src/pages/TripDashboard.tsx` | Remove Unlock tab, add No-Drama badge to header, 4-tab layout |
| `src/components/tabs/FundTab.tsx` | Full restructure into 3 sections |
| `src/components/tabs/OverviewTab.tsx` | Restructure hierarchy, remove packing, add system rules card |
| `src/components/tabs/HypeTab.tsx` | Restructure into commitment/momentum/prep sections |
| `src/components/tabs/PlanTab.tsx` | Merge bookings, connect costs to total, add lock gate |
| `src/components/tabs/UnlockTab.tsx` | DELETE (merged into Plan) |
| `src/components/overview/FundingSummaryCard.tsx` | Simplify for overview use, detail in Fund tab |
| `src/components/overview/MembersCard.tsx` | Add overdue flags, organizer actions |
| `src/components/overview/TripDetailsCard.tsx` | Minor copy updates |
| `src/components/overview/SystemRulesCard.tsx` | NEW - No-Drama enforcement rules display |
| `src/components/overview/TripHealthCard.tsx` | NEW - prominent health score card |
| `src/components/overview/PersonalStatusCard.tsx` | NEW - your share, paid, remaining |
| `src/lib/funding-utils.ts` | Update health score formula, add Trip Health status labels |

---

## Implementation Order

1. Create `useTripRole` hook (foundation for everything)
2. Create new component files (SystemRulesCard, TripHealthCard, PersonalStatusCard)
3. Restructure OverviewTab
4. Restructure FundTab (3-section layout)
5. Restructure HypeTab (3-layer layout)
6. Restructure PlanTab (merge bookings + lock gate)
7. Update TripDashboard (remove Unlock tab, add No-Drama badge, 4 tabs)
8. Delete UnlockTab
9. Update funding-utils with refined health score
10. Update MembersCard with overdue handling

---

## Design Principles Applied

Every feature must tie to one of these pillars:
- **Transparency**: Group funding visible as percentages; personal details private
- **Accountability**: Status badges, commitment indicators, health scores
- **Deadline Enforcement**: System-driven reminders, overdue flags, removal mechanism
- **Emotional Neutrality**: "The system enforces fairness" - not the organizer
- **Commitment Visibility**: Investment tracking, completion percentages, social momentum

Features that don't serve these pillars are removed or simplified.
