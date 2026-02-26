

## Plan: Add Contribution Section to Fund Tab + Fix Build Error

### 1. Fix Edge Function Build Error
The `create-checkout/index.ts` uses `npm:@supabase/supabase-js@2.57.2` which fails in the Deno environment. Change line 7 to use the esm.sh import pattern instead:
```
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
```

### 2. Add Contribution Section to FundTab
Insert a new card between the Progress Ring section (line ~210) and the public spots card.

Changes to `src/components/tabs/FundTab.tsx`:

- Add a new state variable: `const [contributionAmount, setContributionAmount] = useState<string>("")`
- Add a new state variable: `const [isContributing, setIsContributing] = useState(false)`
- Add a new "Contribute" card with:
  - A labeled number input ("Contribution Amount (USD)")
  - A "Contribute" button that:
    - Sets `isContributing = true`
    - Calls `supabase.functions.invoke("create-checkout", { body: { trip_id: tripId, amount_cents: Number(contributionAmount) * 100 } })`
    - On success, redirects via `window.open(data.url, "_blank")`
    - On error, shows a toast and logs to console
    - Resets `isContributing = false` in `finally`
  - Shows a `Loader2` spinner on the button while loading
  - Disables the button when amount is empty/zero or loading

The section uses the existing `Card`, `CardContent`, `Input`, `Button`, `Label`, `Loader2`, and `CreditCard` icon -- all already imported. Only `Label` needs to be added as an import.

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Fix import from `npm:` to `https://esm.sh/` |
| `src/components/tabs/FundTab.tsx` | Add contribution amount state, contribution card UI after progress ring |
