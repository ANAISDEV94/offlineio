

# Create/Update 6 Stripe Edge Functions + Schema Changes

## Pre-requisites: Missing Database Tables & Columns

Several tables/columns referenced in the spec don't exist yet. A migration is needed first:

### New table: `contributions`
Tracks individual payment intents (pending → succeeded → failed).
```
id (uuid PK), trip_id (uuid), user_id (uuid), amount (numeric),
status (text, default 'pending' — pending/succeeded/failed),
stripe_payment_intent_id (text, unique), stripe_session_id (text),
created_at (timestamptz), updated_at (timestamptz)
```
RLS: members can view trip contributions, users can insert own.

### Alter `user_payment_methods`
Add columns: `stripe_customer_id (text)`, `stripe_payment_method_id (text)` — needed for off-session payments.

### Alter `payment_history`
Add column: `stripe_event_id (text)` — for idempotency on webhook event ID.

---

## Edge Functions

All 6 functions use `verify_jwt = false` in config.toml with manual JWT validation via `getClaims()` (except stripe-webhook which is a public endpoint with signature verification).

### Function 1: `create-connect-account` (NEW)
- Auth check via getClaims()
- Lookup `stripe_connect_accounts` for user
- If fully onboarded → return status
- If exists but incomplete → refresh from Stripe API, return account link
- If new → `stripe.accounts.create({ type: "express", capabilities: { card_payments, transfers } })`, insert row, return account link
- Return/refresh URLs: `{origin}/settings?connect=complete` / `?connect=refresh`

### Function 2: `create-account-link` (NEW)
- Auth check, lookup `stripe_connect_accounts`
- 404 if not found
- Generate `stripe.accountLinks.create()` with same URLs

### Function 3: `connect-account-status` (NEW)
- Auth check, optional `{ user_id }` body (defaults to auth user)
- Lookup + refresh from Stripe if not onboarded
- Return status object

### Function 4: `create-checkout` (UPDATE)
- After existing validation, lookup trip's organizer from `trip_members` (role='organizer')
- Lookup organizer's Connect account from `stripe_connect_accounts`
- If `charges_enabled` → add `payment_intent_data.transfer_data.destination` and `payment_intent_data.application_fee_amount` (2.5%)
- Add `organizer_id` to metadata

### Function 5: `stripe-webhook` (UPDATE)
- Log ALL events to `webhook_events` (idempotent on `stripe_event_id`)
- `checkout.session.completed`: existing logic + insert `contributions` row, call `recalculate_trip_funding()` RPC
- `payment_intent.succeeded`: update contribution status, call recalculate, store payment method in `user_payment_methods`
- `payment_intent.payment_failed`: update contribution status
- `account.updated`: update `stripe_connect_accounts` flags
- `checkout.session.expired`: log only

### Function 6: `create-contribution` (NEW)
- Auth check, parse `{ trip_id, amount }` (dollars)
- Validate membership + remaining balance
- Lookup organizer's Connect account
- Create Stripe PaymentIntent (with Connect destination if available)
- Insert pending `contributions` row
- If user has stored `stripe_payment_method_id` + `stripe_customer_id` → confirm off-session
- Otherwise return `client_secret`

### Config changes
Add to `supabase/config.toml`:
```toml
[functions.create-connect-account]
verify_jwt = false

[functions.create-account-link]
verify_jwt = false

[functions.connect-account-status]
verify_jwt = false

[functions.create-contribution]
verify_jwt = false
```

## Summary of files
- 1 migration (contributions table, alter user_payment_methods, alter payment_history)
- 3 new edge functions (create-connect-account, create-account-link, connect-account-status, create-contribution)
- 2 updated edge functions (create-checkout, stripe-webhook)
- 1 config update (config.toml)

