

# Landing Page Updates

Four changes across two files. The Trip Drama Simulator is already implemented, so that item is done.

## 1. Update Waitlist Section (`src/components/landing/WaitlistSignup.tsx`)

- Title: "Join Early Access" (was "Join the private beta")
- Subtitle label: "Early Access" stays
- Description updated to the new copy about testing with early users
- Button text: "Join Early Access" (was "Get Early Access")
- Success message updated to: "You're on the list! You can also explore the beta while we continue improving the experience."
- Backend/form logic unchanged

## 2. Add Beta Payment Notice (`src/pages/LandingPage.tsx`)

Insert a small info banner between the Lifestyle CTA and the Waitlist section. Light background (`bg-secondary/30`), rounded card, with:
- Title: "Beta Notice" (bold)
- Test card details (4242..., any future date, any CVC, any ZIP)
- Friendly tone, compact design

## 3. Add Footer Beta Disclaimer (`src/pages/LandingPage.tsx`)

Add a line in the footer below the copyright:
> "Offline is currently in beta. Features may change as we continue testing and improving the experience."

Small muted text, consistent with existing footer styling.

## Files Changed

| File | Changes |
|------|---------|
| `src/components/landing/WaitlistSignup.tsx` | Update title, description, button text, success message |
| `src/pages/LandingPage.tsx` | Add beta payment notice section, add footer disclaimer line |

