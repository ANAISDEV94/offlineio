

# Marketing Landing Page

## Overview

Create a new landing page at `/` that serves as the public marketing entry point. The current authenticated flow (`Onboarding`) moves to after login. Unauthenticated visitors see the landing page with hero, value props, how-it-works, and CTA to sign up/sign in.

## Routing Changes

| Current | New |
|---------|-----|
| `/` → Auth check → Onboarding | `/` → Landing page (public) |
| `/auth` → Sign in/up | `/auth` → Sign in/up (unchanged) |
| Onboarding after login | `/dashboard` or keep `/` with auth check redirecting to Onboarding |

**Approach**: Update `Index.tsx` to show the landing page for unauthenticated users instead of redirecting to `/auth`. Authenticated users still see Onboarding.

## Landing Page Sections

1. **Hero** — Full-width section with the offline logo, headline ("Group trips without the money stress"), subtext about the value prop for women traveling together, and two CTAs: "Get Started" → `/auth` (signup) and "Sign In" → `/auth`.

2. **Social proof strip** — Simple text like "Trusted by 500+ trip organizers" or similar aspirational copy.

3. **How It Works** — 3-step visual flow:
   - Step 1: "Plan Together" — AI-powered trip planning with your group
   - Step 2: "Fund Fairly" — Split costs, track payments, no awkward convos
   - Step 3: "Go Offline" — Travel stress-free with everything handled

4. **Value Props** — 2-3 feature cards highlighting:
   - AI trip planner
   - Payment tracking & splitting
   - Group coordination (invites, roles, deadlines)

5. **Lifestyle/emotional section** — A full-width banner with aspirational copy: "Travel with your girls. Leave the stress at home." with a CTA.

6. **Footer** — Minimal footer with logo and copyright.

## Design

- Uses existing brand palette (rose/pink primary, olive accent, Cormorant Garamond display font, Inter body)
- Framer Motion animations for scroll-in effects
- Mobile-first responsive layout
- Hero uses gradient or soft blush background consistent with card colors
- Placeholder lifestyle images via Unsplash URLs (women traveling, beach, brunch aesthetics)

## Files

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Show `LandingPage` for unauthenticated users instead of redirecting to `/auth` |
| `src/pages/LandingPage.tsx` | New — full marketing landing page component |

