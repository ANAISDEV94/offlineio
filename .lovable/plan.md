

# Design System Refinement -- "Offline" Soft Luxury Pass

The color palette, fonts, and CSS variables are already correct from the previous refactor. This pass focuses on the remaining refinements: logo treatment, typography weight cleanup, increased whitespace, radius bump, and shadow softening.

---

## 1. Logo Treatment

**Files: `Auth.tsx`, `Onboarding.tsx`**

- Change "Offline" to lowercase **"offline"** for modern, confident branding
- Increase letter spacing from `tracking-wide` to `tracking-[0.15em]` (wider, editorial)
- Keep `font-semibold` (600 weight in Cormorant Garamond) for the logo
- Make the Plane icon in Auth thinner: reduce from `h-10 w-10` to `h-8 w-8` and add `strokeWidth={1.5}` for a more refined look

## 2. Border Radius Bump

**File: `src/index.css`**

- Change `--radius` from `0.75rem` (12px) to `1rem` (16px) for softer, more premium corners

## 3. Typography Weight Cleanup

Replace remaining `font-bold` instances with lighter weights:

| File | Change |
|---|---|
| `NotFound.tsx` | `font-bold` on 404 heading to `font-semibold` |
| `PayTab.tsx` | `font-bold` on total to `font-semibold` |
| `PayTab.tsx` | `font-semibold` on member names to `font-medium` |

Also reduce `font-semibold` to `font-medium` on secondary data values across tabs (countdown numbers in FundTab and HypeTab remain `font-semibold` as primary display data).

## 4. Card Padding and Section Spacing

Increase whitespace across all tab components and pages for a more editorial, breathable layout:

- **All tabs** (`FundTab`, `PlanTab`, `UnlockTab`, `HypeTab`): Change outer container `space-y-5` / `space-y-6` to `space-y-8`
- **Card padding**: Increase `p-4` to `p-5` and `p-5` to `p-6` on primary content cards
- **TripDashboard**: Increase padding between header and tabs from `-mt-2` to `mt-2`
- **CreateTrip**: Add `space-y-8` between wizard steps (currently `space-y-6`)
- **Onboarding**: Increase card padding from `p-5` to `p-6`

## 5. Shadow Refinement

- Remove remaining `hover:shadow-md` on Onboarding trip cards, replace with `hover:shadow-sm` for subtler hover state
- Ensure no `shadow-lg` or `shadow-xl` remains in custom components (UI primitives like Dialog are fine as-is)

## 6. Button Hover State

**File: `src/components/ui/button.tsx`**

- Already uses `hover:bg-primary/85` which approximates #B94A65 -- no change needed
- Confirm `font-medium` is set (already correct)

## 7. Accent Color Usage Guidance

No code changes, but ensure the olive accent (`#5E6B55`) is only used for:
- "Funds Protected" shield badge
- "Paid in Full" / positive status badges
- Success states

This is already the case in the current code.

## 8. Memory Update

Update the project memory to replace the "girly feminine" description with the new brand direction:
- Soft feminine luxury + modern travel tech + financial infrastructure disguised as lifestyle
- "Luxury resort lobby + fintech clarity + women's travel club"

---

## Files Summary

| File | Changes |
|---|---|
| `src/index.css` | `--radius` from `0.75rem` to `1rem` |
| `src/pages/Auth.tsx` | Lowercase logo, wider tracking, thinner plane icon |
| `src/components/Onboarding.tsx` | Lowercase logo, wider tracking, increased padding, softer hover shadows |
| `src/pages/NotFound.tsx` | `font-bold` to `font-semibold` |
| `src/components/tabs/PayTab.tsx` | `font-bold` to `font-semibold`, `font-semibold` to `font-medium` |
| `src/components/tabs/FundTab.tsx` | Increased section spacing (`space-y-8`), card padding |
| `src/components/tabs/PlanTab.tsx` | Increased section spacing (`space-y-8`), card padding |
| `src/components/tabs/UnlockTab.tsx` | Increased section spacing (`space-y-8`), card padding |
| `src/components/tabs/HypeTab.tsx` | Increased section spacing (`space-y-8`), card padding |
| `src/pages/TripDashboard.tsx` | Increased spacing between header and tabs |
| `src/pages/TripPreview.tsx` | Increased section spacing |
| `src/pages/CreateTrip.tsx` | Increased step spacing |

No database changes. No new dependencies.

