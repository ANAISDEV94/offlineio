

# Remove All Em Dashes From the App

Replace every visible em dash (`—`) with either a regular dash (`-`), a comma, or reworded text, depending on context. Code comments are left as-is since they're not user-facing.

## Files and Changes

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `src/pages/LandingPage.tsx` | 60 | `— all in one place` | `. All in one place` |
| `src/pages/LandingPage.tsx` | 221 | `itinerary — activities, dining, logistics — tailored` | `itinerary: activities, dining, logistics, tailored` |
| `src/pages/LandingPage.tsx` | 224 | `payment rules — so the organizer` | `payment rules so the organizer` |
| `src/pages/LandingPage.tsx` | 269 | `coordination — so all you` | `coordination, so all you` |
| `src/pages/CreateTrip.tsx` | 252 | `{steps.length} — {steps[step]}` | `{steps.length} - {steps[step]}` |
| `src/pages/CreateTrip.tsx` | 577 | `Skip — Start Fresh` | `Skip - Start Fresh` |
| `src/components/tabs/FundTab.tsx` | 349 | `{dashboard.health_score}% — {dashboard.health_label}` | `{dashboard.health_score}% - {dashboard.health_label}` |
| `src/components/tabs/FundTab.tsx` | 395 | `Pay Full Balance — $` | `Pay Full Balance - $` |
| `src/components/tabs/FundTab.tsx` | 399 | `Pay Installment — $` | `Pay Installment - $` |
| `src/components/tabs/PlanTab.tsx` | 26 | `return "—"` | `return "-"` |
| `src/components/tabs/PlanTab.tsx` | 358 | `\|\| "—"` | `\|\| "-"` |
| `src/components/tabs/SettingsTab.tsx` | 141 | `\|\| "—"` | `\|\| "-"` |
| `src/pages/AdminDebug.tsx` | 20 | `let hostname = "—"` | `let hostname = "-"` |
| `src/components/overview/FundingSummaryCard.tsx` | 191 | `Pay Now — $` | `Pay Now - $` |
| `src/components/overview/PaymentDeadlineCard.tsx` | 18 | `days left — ${format(...)` | `days left - ${format(...)` |

Code comments (e.g. in `AiPlannerDemo.tsx`, `stripe-webhook/index.ts`, `create-checkout/index.ts`, `main.tsx`) are not user-visible and will be left unchanged.

**12 files touched, ~15 single-character/word replacements. No logic changes.**

