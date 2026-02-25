

# Replace Logo with Uploaded Image

Replace the text-based "offline" logo and the Plane icon across the app with the uploaded script logo image.

---

## 1. Copy the Logo Asset

Copy `user-uploads://7B8E3BF0-765B-4256-AC98-0DE48BF55517.PNG` to `src/assets/logo.png`.

## 2. Auth Page (`src/pages/Auth.tsx`)

- Remove the `Plane` icon import and the animated Plane `<motion.div>` block (lines 65-71)
- Replace the `<h1>offline</h1>` text with an `<img>` tag using the imported logo
- Size: `h-16` (64px height), auto width, centered
- Keep the tagline "Log off. Lock in." below
- Remove `Plane` from the lucide-react import

## 3. Onboarding Header (`src/components/Onboarding.tsx`)

- Replace the `<h1>offline</h1>` text in the header (line 112) with the logo `<img>`
- Size: `h-8` (32px height) for the smaller header context
- Remove the floating airplane emoji `<motion.div>` block (lines 124-129) in the hero section since the logo itself contains the plane

## 4. Loading Screen (`src/pages/Index.tsx`)

- Replace the airplane emoji `✈️` in the loading state with the logo image for brand consistency
- Size: `h-12` (48px height)

---

## Files Changed

| File | Change |
|---|---|
| `src/assets/logo.png` | New file (copied from upload) |
| `src/pages/Auth.tsx` | Remove Plane icon, replace text logo with image |
| `src/components/Onboarding.tsx` | Replace text logo with image, remove floating emoji |
| `src/pages/Index.tsx` | Replace loading emoji with logo image |

No database changes. No new dependencies.

