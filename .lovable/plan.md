

# Refactor Overview + Fund for Per-Person Payment Calculations and Stripe Checkout

## What Changes

### 1. Database: Add `total_cost` column to `trips` table

The current schema uses `per_person_budget` but there's no `total_cost` field. We need to add it so all calculations can derive from it.

**Migration:**
```sql
ALTER TABLE public.trips ADD COLUMN total_cost numeric NOT NULL DEFAULT 0;
```

The computed values (`per_person_cost`, `total_funded`, `total_remaining`, `percent_funded`) will all be calculated in the frontend from existing data -- no new columns needed for those.

### 2. Database: Add `stripe_session_id` to `payments` table

Track which Stripe session corresponds to each payment event. Also add a `payment_history` table for individual transaction records.

**Migration:**
```sql
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payment history"
ON public.payment_history FOR SELECT
USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "System can insert payment history"
ON public.payment_history FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

Also add `autopay_enabled` to `payments`:
```sql
ALTER TABLE public.payments ADD COLUMN autopay_enabled boolean NOT NULL DEFAULT false;
```

### 3. Overview Tab -- Redesigned Funding Summary (top of page)

Replace the current `QuickStats` + `GroupFundingCard` with a single premium **Funding Summary Card** at the top showing:

- **Trip total**: `$total_cost`
- **Per-person**: `total_cost / member_count`
- **Funded**: sum of all `amount_paid`
- **Remaining**: `total_cost - funded`
- **Deadline**: countdown with "X days left"
- **Large animated progress circle** (reuse the SVG ring from FundTab)

Below it, a **Group Funding list** showing each member:
- Name, % complete, paid/remaining, status badge (Paid / On Track / Behind)
- **No-Drama Mode toggle** to hide dollar amounts

Then a **personal CTA card** for the logged-in user:
- "You've paid $X, you have $Y left"
- Prominent "Pay Now" button that invokes `create-checkout`

### 4. Fund Tab -- Payment Plan + Payment History

**Payment Plan section** (for logged-in user):
- Select plan type: Weekly / Biweekly / Monthly / Custom
- For custom: select number of payments
- Computed suggested installment amount and next due date displayed
- Auto-pay toggle (stores `autopay_enabled` boolean, shows "Auto-pay will run on due dates" -- no card storage)
- Saving plan updates `payments.installment_plan` and `payments.next_due_date`

**Payment History section** (for logged-in user):
- List from `payment_history` table filtered by `trip_id` and `user_id`
- Shows date, amount, status for each transaction

Keep existing member list with Stripe "Pay Now" buttons.

### 5. Stripe Checkout Flow (already working, minor tweaks)

The `create-checkout` edge function already works. Tweaks:
- Pass the trip name in the `product_data.name` field for better Stripe receipt
- The `stripe-webhook` already updates `payments.amount_paid` -- add logic to also insert a row into `payment_history`

### 6. Member Status Calculation Logic

Centralize status computation in both Overview and Fund:
```
per_person_cost = total_cost / member_count
amount_remaining = per_person_cost - amount_paid
status:
  - "Paid" if amount_remaining <= 0
  - "Behind" if amount_remaining > 0 AND deadline within 7 days
  - "On Track" otherwise
```

### 7. Reminders (Database + UI indicator only for MVP)

Add reminder records to `notifications` table based on deadline proximity. For MVP, show reminder badges in the UI when a member is within 14/7/3/1 days of deadline with remaining balance. Actual push/email notifications would require a cron job (noted but not built in this pass unless requested).

The reminder copy will use the Offline voice: "Log off. Lock in."

### 8. Sample Data

Seed the UI with fallback display when no real data exists:
- Trip total $4,000, 5 members, per-person $800
- Deadline in 30 days
- Partial payments: 2 members paid in full, 1 at 50%, 2 at 25%

This will be shown as placeholder/demo content, not inserted into the database.

---

## Files Modified

| File | Change |
|---|---|
| `supabase/migrations/new.sql` | Add `total_cost` to trips, `autopay_enabled` to payments, create `payment_history` table |
| `src/components/tabs/OverviewTab.tsx` | Replace top section with Funding Summary card, group member list with No-Drama toggle, personal CTA with Pay Now |
| `src/components/overview/QuickStats.tsx` | Remove or replace with new FundingSummaryCard component |
| `src/components/overview/GroupFundingCard.tsx` | Replace with member-level funding list |
| `src/components/tabs/FundTab.tsx` | Add Payment Plan section with installment config, Payment History list, auto-pay toggle |
| `supabase/functions/stripe-webhook/index.ts` | Also insert into `payment_history` on successful payment |
| `supabase/functions/create-checkout/index.ts` | Include trip name in product description |

## UI Style

- Premium soft-luxury aesthetic maintained
- Large animated SVG progress ring on Overview
- No spreadsheet look -- card-based layout with generous spacing
- Offline color palette and `font-display` typography throughout
