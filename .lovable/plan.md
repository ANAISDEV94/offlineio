

# DÉPARTE — Girls' Trip Planning App

## Overview
A mobile-first web app for planning group trips with your girls. Combines trip planning, group payment tracking, booking links, packing lists, outfit sharing, and hype messaging — all in a cute, feminine UI.

## Tech Stack
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (database, auth, storage, edge functions)
- **Auth**: Email/password signup & login
- **Payments**: Mock UI (no real Stripe for V1)

---

## Phase 1: Foundation

### Authentication
- Sign up / Log in pages with email + password
- User profiles table (display name, avatar)
- Cute, branded auth screens matching the DÉPARTE aesthetic

### Design System
- Pastel color palette (soft pinks, lavenders, warm neutrals, glossy accents)
- Rounded cards, soft shadows, playful typography
- Subtle animations (confetti on milestones, smooth tab transitions)
- Mobile-first layout optimized for phone screens

---

## Phase 2: Core Trip Flow

### Onboarding
- Landing screen with two options: **Create a Trip** or **Join a Trip** (via invite link)

### Create Trip Wizard
- Step-by-step form: destination, dates, group size, vibe selector (luxury / soft life / party / wellness / cultural), per-person budget, payment deadline
- Invite friends via email at the end
- Generates a shareable invite link

### Trip Dashboard
- Top-level view showing trip name, destination, countdown, and member avatars
- **6 tabs**: Plan, Pay, Book, Pack, Fits, Hype

---

## Phase 3: All 6 Tabs (Full UI Scaffold)

### 📋 Plan Tab
- Day-by-day itinerary builder — add activities per day
- Budget breakdown by category (hotel, flights, activities, food, buffer) with editable amounts
- Visual progress bars showing spend vs. budget

### 💰 Pay Tab
- Per-person payment summary: amount owed, paid, remaining, next due date
- Installment plan selector (weekly / biweekly / monthly / custom)
- "Pay Now" button (mock — shows confirmation)
- Auto-pay toggle (UI only)
- **Organizer view**: See each member's payment status, send gentle reminder button

### ✈️ Book Tab
- Sections for Flights, Hotels, Activities
- Curated affiliate-style links or embedded search placeholders
- Save selected bookings to the trip with notes/links

### 🧳 Pack Tab
- Destination-based suggested packing checklist (auto-generated based on vibe/destination)
- Personal checklist per member — add/check off items
- Reminder badges at 14, 7, and 3 days before departure

### 👗 Fits Tab
- Outfit photo board — members upload outfit images
- Tag outfits by occasion (dinner / beach / night out / airport / day 1)
- Emoji reactions and comments on each outfit post
- Uses Supabase Storage for image uploads

### 🎉 Hype Tab
- Countdown timeline with cute milestone messages ("Hey queen, 60 days left until Italy! 🇮🇹")
- Payment reminders woven in ("Soft reminder babe, you have $100 left by March 6 💅")
- Auto-generated based on trip date and payment deadlines

---

## Phase 4: Data & Backend

### Database (Supabase)
- **Users & Profiles** — auth + display info
- **Trips** — destination, dates, vibe, budget, status
- **TripMembers** — links users to trips with role (organizer/member)
- **ItineraryItems** — day, time, activity, notes per trip
- **BudgetCategories** — category name + amount per trip
- **Payments** — amount, date, status per member per trip
- **InstallmentPlans** — schedule per member
- **OutfitPosts** — image URL, tags, user, trip
- **OutfitReactions** — emoji reactions + comments
- **PackingLists & PackingItems** — per-member checklists
- **Notifications** — hype messages, reminders

### Row-Level Security
- Members can only see trips they belong to
- Organizers have elevated permissions within their trip
- Outfit posts and reactions scoped to trip members

---

## Phase 5: Automations & Polish

### Automated Reminders (Edge Functions)
- Monthly countdown hype messages
- Payment deadline reminders for behind-schedule members
- Packing reminders at 14/7/3 days before departure

### Celebratory Moments
- Confetti animation when trip is fully funded 🎊
- Milestone celebrations on the Hype tab

### Sample Data
- Pre-loaded realistic sample trip (e.g., "Italy Girlies Trip 2026") with sample members, itinerary, payments, and outfits so the app feels alive from the start

