

# Fix Payment Tracking After Stripe Checkout

## Problem
After a successful Stripe checkout, the app redirects back but payments aren't recorded. Two issues cause this:

1. **Webhook crash**: The `stripe-webhook` function uses `stripe.webhooks.constructEvent()` (synchronous), but Deno requires the async version `constructEventAsync()`. Every webhook call fails with "SubtleCryptoProvider cannot be used in a synchronous context", so `payment_history` is never written and `payments.amount_paid` is never updated.

2. **No post-payment refresh**: When Stripe redirects back to `/trip/{id}?payment=success`, the app doesn't detect the query parameter, show a confirmation, or refresh the dashboard data.

## Plan

### 1. Fix the webhook (stripe-webhook/index.ts)
- Replace `stripe.webhooks.constructEvent(body, signature, webhookSecret)` with `await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)`
- This is the only change needed -- the rest of the webhook logic (insert into `payment_history`, update `payments.amount_paid`) is already correct

### 2. Add post-payment detection (TripDashboard.tsx)
- Read `?payment=success` from the URL on mount
- Show a success toast confirming the payment went through
- Force-refresh the dashboard query so updated amounts appear immediately
- Clean the query param from the URL so refreshing doesn't re-trigger the toast
- Also switch to the "fund" tab automatically so the user sees their updated balance

### 3. Deploy and verify
- Deploy the updated `stripe-webhook` function
- Confirm the webhook processes successfully in logs

## Technical Details

**File changes:**

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Line 45: `constructEvent` to `await constructEventAsync` |
| `src/pages/TripDashboard.tsx` | Add `useEffect` + `useSearchParams` to detect `?payment=success`, show toast, refresh dashboard, switch to fund tab |

No database or migration changes needed -- the schema already supports everything. The webhook was just failing silently.

