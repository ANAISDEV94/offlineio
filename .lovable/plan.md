

## Fix: 400 Bad Request on Contribute (Amount Exceeds Remaining Balance)

### Root Cause

The 401 is fully fixed — the function now authenticates successfully. The new error is **400 Bad Request** caused by a balance validation in `create-checkout`:

The trip `Casa Cabo` has `total_cost = 0` (no budget set yet). This means the `trip_member_funding` view returns `per_person_cost = 0` and `amount_remaining = 0`. The edge function then rejects: `200000 > 0` → "Amount exceeds remaining balance."

### Fix

In `supabase/functions/create-checkout/index.ts`, skip the remaining-balance guard when `per_person_cost` is 0 (i.e., no budget has been set yet). This allows contributions to flow before a total cost is finalized — which is the expected MVP behavior.

### Change (1 file)

**`supabase/functions/create-checkout/index.ts`** (lines 100-121)

Current logic:
```typescript
const remainingDollars = Number(funding?.amount_remaining ?? 0);
const remainingCents = Math.round(remainingDollars * 100);
if (amount_cents > remainingCents) {
  return _json({ error: `Amount exceeds remaining balance...` }, 400);
}
```

Updated logic:
```typescript
const perPersonCost = Number(funding?.per_person_cost ?? 0);
const remainingDollars = Number(funding?.amount_remaining ?? 0);
const remainingCents = Math.round(remainingDollars * 100);

// Only enforce the cap when a per-person cost has been set (total_cost > 0)
if (perPersonCost > 0 && amount_cents > remainingCents) {
  return _json({ error: `Amount exceeds remaining balance. You owe $${remainingDollars.toFixed(2)}.` }, 400);
}
```

Also add a diagnostic log so we can confirm the check was skipped or applied:
```typescript
console.log("[create-checkout] perPersonCost:", perPersonCost, "remainingCents:", remainingCents);
```

### Technical Details

- The `trip_member_funding` view computes `per_person_cost` from `trips.total_cost / member_count`. When `total_cost` is 0, both values are 0.
- After this fix, contributions are uncapped until an organizer sets the trip budget. Once set, the balance guard activates normally.
- Only 1 file changes; redeploy `create-checkout` afterward.

### After Deploy — Expected Flow

1. Click Contribute with $2000 → function accepts, creates Stripe session, redirects to checkout
2. Edge function logs show: `perPersonCost: 0 remainingCents: 0` then `Stripe session created: cs_...`
3. Stripe Checkout opens successfully

