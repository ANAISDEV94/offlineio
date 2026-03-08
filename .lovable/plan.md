

# Make Landing Page Accessible to All Users

## Problem
Currently, `Index.tsx` checks auth state and redirects signed-in users straight to the Onboarding component, hiding the landing page entirely.

## Solution
Add a dedicated `/welcome` route that always renders the `LandingPage` component regardless of authentication status.

## Changes

**`src/App.tsx`**
- Add route: `<Route path="/welcome" element={<LandingPage />} />`

**`src/pages/LandingPage.tsx`**
- No changes needed — it already renders independently.

**`src/components/Onboarding.tsx`** (optional)
- Could add a small "View our website" link in the header that navigates to `/welcome`, so signed-in users can easily find the landing page.

## Behavior
- `/` — same as today: signed-in users see Onboarding, visitors see Landing Page
- `/welcome` — always shows Landing Page for anyone

This is a two-line change at minimum (route + import if needed). The landing page CTA buttons ("Get Started", etc.) already link to `/auth`, so they'll continue working for both signed-in and signed-out users.

