

# Waitlist Signup Section on Landing Page

## Overview

Add a "Join the private beta" waitlist section to the landing page, storing submissions in the database (since user chose existing database over Airtable).

## Database

Create a `waitlist` table with public INSERT (no auth required — this is a public landing page form) and restricted SELECT.

```sql
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up (public form, no auth)
CREATE POLICY "Anyone can insert waitlist" ON public.waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- No public reads
CREATE POLICY "No public reads" ON public.waitlist
  FOR SELECT TO authenticated
  USING (false);
```

## UI Component

Create `src/components/landing/WaitlistSignup.tsx`:
- Card with title "Join the private beta", description text
- Name + Email inputs using existing shadcn Input component
- Submit button, loading state, success message ("You're on the list. We'll invite you soon.")
- Uses `supabase.from('waitlist').insert(...)` directly (anon key, RLS allows insert)
- Matches existing landing page aesthetic (motion animations, brand fonts/colors)

## Landing Page

Insert the waitlist section in `LandingPage.tsx` between the Lifestyle CTA banner and the footer — the natural "bottom of page" conversion point.

## Files

| File | Change |
|------|--------|
| Database migration | Create `waitlist` table with RLS |
| `src/components/landing/WaitlistSignup.tsx` | New waitlist form component |
| `src/pages/LandingPage.tsx` | Import and add waitlist section |

