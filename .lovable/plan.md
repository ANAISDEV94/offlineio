

# Add Payment Details Section to Settings Tab

## What This Does
Adds a private "Payment Details" card to the Settings tab where each user can view and manage their saved payment method (card info, billing name). For now this uses mock/manually-entered details stored securely in the database, with the card number masked for display.

## Database Change

**New table: `user_payment_methods`**
- `id` (uuid, PK)
- `user_id` (uuid, not null, unique) -- one payment method per user for now
- `card_brand` (text) -- e.g. "Visa", "Mastercard"
- `card_last_four` (text) -- last 4 digits only, never store full card number
- `card_exp_month` (int)
- `card_exp_year` (int)
- `billing_name` (text)
- `created_at`, `updated_at` (timestamps)

**RLS policies** (strict, user-only):
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

This ensures payment details are completely private per user.

## Frontend Change

**`src/components/tabs/SettingsTab.tsx`** -- Add a new "Payment Details" card between the Security and Payment History sections:

1. **Display mode**: Shows saved card as "Visa ending in 4242, Exp 03/27, Billing: John Doe" with an Edit button
2. **Edit mode**: Form fields for card brand (dropdown: Visa/Mastercard/Amex/Discover), last 4 digits, expiration month/year, and billing name
3. **Empty state**: "No payment method on file" with an "Add Payment Method" button
4. Queries `user_payment_methods` for the current user; upserts on save

No styling changes -- uses the same Card/Input/Button components and patterns already in the file.

## Files Changed

| File | Change |
|------|--------|
| DB migration | Create `user_payment_methods` table with RLS |
| `src/components/tabs/SettingsTab.tsx` | Add Payment Details card with view/edit/add flow |

