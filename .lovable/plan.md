

# Move Beta Notice from Landing Page to In-App

The Beta Notice with Stripe test card info belongs inside the authenticated app experience, not the public landing page. Users only need this when they're about to make payments.

## Changes

### 1. Remove Beta Notice from `src/pages/LandingPage.tsx`
Delete the entire "Beta Payment Notice" `<section>` block (lines ~208-222 in the current file).

### 2. Add Beta Notice to `src/components/Onboarding.tsx`
Add a small, styled beta notice card at the bottom of the onboarding/home screen. This is the first screen authenticated users see, making it the right place to surface test payment info. It will use the same visual style (rounded card, muted text, mono code block) but be more compact to fit the app context.

### 3. Optionally also show in Fund tab
Since the Fund tab is where payments actually happen, a smaller inline notice there would also make sense. But starting with Onboarding keeps it simple.

