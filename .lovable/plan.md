
# Design System Overhaul -- "Offline"

Rebrand from the current "girly pink" aesthetic to a structured soft-luxury identity with new typography, colors, and refined spacing.

---

## 1. Google Fonts Swap

**File: `src/index.css`** (line 1)

Replace the Google Fonts import:
- Remove: Playfair Display + DM Sans
- Add: Cormorant Garamond (weights 500, 600) + Inter (weights 400, 500)

## 2. CSS Custom Properties Update

**File: `src/index.css`** -- `:root` block

Replace all HSL color variables with the new palette:

| Token | New HSL Value | Hex Reference |
|---|---|---|
| `--background` | `20 24% 96%` | #F7F3F1 |
| `--foreground` | `0 0% 17%` | #2B2B2B |
| `--card` | `345 82% 95%` | #FCE9EE |
| `--card-foreground` | `0 0% 17%` | #2B2B2B |
| `--popover` | `20 24% 96%` | #F7F3F1 |
| `--popover-foreground` | `0 0% 17%` | #2B2B2B |
| `--primary` | `348 58% 59%` | #D45A78 |
| `--primary-foreground` | `0 0% 100%` | white |
| `--secondary` | `345 82% 95%` | #FCE9EE |
| `--secondary-foreground` | `0 0% 17%` | #2B2B2B |
| `--muted` | `23 16% 93%` | warm neutral |
| `--muted-foreground` | `0 1% 42%` | #6D6A6A |
| `--accent` | `94 10% 38%` | #5E6B55 olive |
| `--accent-foreground` | `0 0% 100%` | white |
| `--border` | `23 16% 90%` | #E9E4E1 |
| `--input` | `23 16% 90%` | #E9E4E1 |
| `--ring` | `348 58% 59%` | #D45A78 |
| `--radius` | `0.75rem` | 12px buttons |

Remove the custom palette tokens (`--lavender`, `--blush`, `--peach`, `--mint`, `--gold`) and replace with a single `--olive` accent token.

Update dark mode variables to complement the new palette (darker warm tones, same hue family).

Update the body and heading font-family rules:
- Body: `'Inter', sans-serif`
- Headings: `'Cormorant Garamond', serif`

Update `.glass` and `.glass-card` to use `shadow-sm` instead of `shadow-lg` for subtler shadows.

## 3. Tailwind Config Update

**File: `tailwind.config.ts`**

- Change `fontFamily.sans` to `["Inter", "sans-serif"]`
- Change `fontFamily.display` to `["Cormorant Garamond", "serif"]`
- Remove `lavender`, `blush`, `peach`, `mint`, `gold` color entries
- Add `olive: "hsl(var(--olive))"` color entry
- Keep `--radius` at `0.75rem` (12px) for medium-rounded corners

## 4. Button Component Update

**File: `src/components/ui/button.tsx`**

- Update hover state for primary: `hover:bg-primary/85` (maps to ~#B94A65 feel)
- Ensure `font-medium` (500) instead of any `font-semibold` or `font-bold`

## 5. App Title and Microcopy

**File: `index.html`**
- Update `<title>` to "Offline"
- Update og:title to "Offline"

**File: `src/pages/Auth.tsx`**
- Replace "DEPARTE" with "Offline" in the logo heading
- Add `letter-spacing: 0.5px` to logo text (`tracking-wide`)
- Change `font-bold` to `font-semibold` (600 weight for H1)
- Update tagline to "Log off. Lock in." or similar

**File: `src/components/Onboarding.tsx`**
- Replace "DEPARTE" with "Offline"
- Change `font-bold` headings to `font-semibold`

## 6. Global Typography Cleanup

Across all component files (~26 files with `font-bold`):

- Replace `font-bold` with `font-semibold` on H1 headings (maps to Cormorant Garamond 600)
- Replace `font-bold` with `font-medium` on H2/H3 headings (maps to Cormorant Garamond 500)
- Replace `font-bold` / `font-semibold` on body text and data values with `font-medium`
- Keep `font-medium` on buttons (Inter 500)

Key files to update:
- `src/components/tabs/FundTab.tsx`
- `src/components/tabs/PlanTab.tsx`
- `src/components/tabs/UnlockTab.tsx`
- `src/components/tabs/HypeTab.tsx`
- `src/pages/TripDashboard.tsx`
- `src/pages/TripPreview.tsx`
- `src/pages/CreateTrip.tsx`
- `src/components/AppTour.tsx`

## 7. Shadow and Spacing Refinement

Across components:
- Replace `shadow-lg` with `shadow-sm` on cards
- Replace `shadow-xl` with `shadow-md` on hover states
- Add more vertical padding/margin between major sections (`py-8` instead of `py-4` where appropriate)
- Ensure card borders use the new warm `--border` tone

## 8. Color Reference Cleanup

Any hardcoded references to the old palette tokens (`lavender`, `blush`, `peach`, `mint`, `gold`) in component files will be replaced with the new system:
- Gradient backgrounds using old pastels will shift to subtle warm neutrals or use `primary/5`, `primary/10` for tints
- The olive accent (`accent`) will be used sparingly for success states or secondary CTAs

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/index.css` | Fonts, CSS variables, glass utilities |
| `tailwind.config.ts` | Font families, color tokens |
| `index.html` | Title to "Offline" |
| `src/components/ui/button.tsx` | Font weight, hover state |
| `src/pages/Auth.tsx` | Brand name, typography |
| `src/components/Onboarding.tsx` | Brand name, typography |
| `src/components/tabs/FundTab.tsx` | Typography, shadows, colors |
| `src/components/tabs/PlanTab.tsx` | Typography, shadows, colors |
| `src/components/tabs/UnlockTab.tsx` | Typography, shadows, colors |
| `src/components/tabs/HypeTab.tsx` | Typography, shadows, colors |
| `src/pages/TripDashboard.tsx` | Typography, shadows, colors |
| `src/pages/TripPreview.tsx` | Typography, shadows, colors |
| `src/pages/CreateTrip.tsx` | Typography, shadows, colors |
| `src/components/AppTour.tsx` | Typography, shadows, colors |

No database changes required. No new dependencies needed (both fonts are on Google Fonts).
