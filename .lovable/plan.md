

# Remove Hype Slide from Onboarding Tour

## What Changes

**File: `src/components/AppTour.tsx`**

Remove the "Hype" slide (lines 27-31) from the `slides` array. This was the 5th and final slide with the party emoji, titled "Hype", describing countdown, outfits, and packing list features that no longer exist in the app.

Optionally replace it with a "Settings" slide that references the new tab:
- Emoji: gear or lock
- Title: "Settings"
- Description: "Manage your profile, update your password, and keep your payment details secure."

This keeps the tour at 5 slides and accurately reflects the current app experience. The rest of the component (navigation, dots, animations) works dynamically off the `slides` array length, so no other changes are needed.

## File Changed

| File | Change |
|------|--------|
| `src/components/AppTour.tsx` | Replace the Hype slide with a Settings slide in the `slides` array |
