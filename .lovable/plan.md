

# Funding Gate + Organizer Booking Coordinator MVP

## Overview
Transform the Plan tab from a booking engine into a **funding-first coordinator**. Before 100% funded, everything is locked with clear CTAs to fund. After 100%, the organizer gets booking management cards to track flights, stays, and experiences.

---

## 1. Database Changes (1 migration)

### New table: `organizer_bookings`
Stores the organizer's booking status per category per trip.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| trip_id | uuid NOT NULL | |
| category | text NOT NULL | flights, stay, experiences |
| status | text NOT NULL | default 'not_booked' (not_booked / in_progress / booked) |
| booking_url | text | Optional link |
| confirmation_number | text | Optional |
| receipt_url | text | Optional (storage file path) |
| notes | text | Multiline notes |
| updated_by | uuid | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**RLS**: Members can SELECT for their trip. Only organizers can INSERT/UPDATE/DELETE.

### New table: `trip_documents`
Stores uploaded receipts and itineraries.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| trip_id | uuid NOT NULL | |
| title | text NOT NULL | |
| file_url | text NOT NULL | storage path |
| uploaded_by | uuid NOT NULL | |
| created_at | timestamptz | default now() |

**RLS**: Members can SELECT. Organizers can INSERT/DELETE.

### New storage bucket: `trip-documents`
Public bucket for receipts and itinerary PDFs.

---

## 2. Plan Tab - Locked State (funded_percent < 1)

### Changes to `PlanTab.tsx`:

**Top banner** (replaces current simple lock card):
- Lock icon + "Bookings unlock at 100% funded."
- Subtitle: "Once funded, the organizer will book everything and share confirmations here."
- Progress bar showing current funding %
- Primary "Go to Fund" button that switches to the Fund tab

**Category sections** (Flights, Stay, Experiences, Shared Costs, Buffer):
- Render all 5 category cards but with `opacity-60` and a lock overlay
- Under each locked section title: "Fund the trip to unlock planning details and booking assignments."
- Disable all add/edit/delete interactions

**AI Planner card**: Still visible (planning ahead is fine), but saving drafts is allowed since they're just drafts.

---

## 3. Plan Tab - Unlocked State (funded_percent >= 1)

### Unlocked banner (replaces lock banner):
- Title: "Bookings Unlocked"
- Subtitle: "Organizer books. Everyone stays in sync."

### Organizer Booking Cards (new component):
For each of Flights, Stay, Experiences -- show an "Organizer Booking Card" at the top of that category section:

- **Status badge**: Not Booked (gray) / In Progress (yellow) / Booked (green)
- **Booking link** field (URL input, clickable when filled)
- **Confirmation number** field (text input)
- **Upload receipt** button (file upload to `trip-documents` bucket)
- **Notes** field (multiline textarea)
- **Save button** to upsert to `organizer_bookings`

Only the organizer can edit these fields. Members see them read-only.

### Existing booking items + itinerary
Continue showing as-is (already working), now without the opacity/lock.

---

## 4. Fund Tab - "How This Works" Card

### Add a card at the top of FundTab (before "Your Responsibility"):

```text
Header: "How funding + booking works"
Bullets:
- "Everyone pays their share into the trip pool."
- "When the trip hits 100% funded, bookings unlock."
- "The organizer books flights/stay/experiences and posts confirmations and receipts here."

Note: "Your payment is processed by Stripe. We never store your card details."
```

---

## 5. Overview Tab - Clarity Lines

### Under Group Funding card:
Add a small note below the progress bar:
"Unlocks planning and booking checklist at 100% funded."

### Under Trip Details card (TripDetailsCard):
Add one line under "Per Person":
"Per-person share updates automatically as members join."

---

## 6. Settings Tab - Trip Documents Section

### New "Trip Documents" card (before Payment History):

- Title: "Trip Documents"
- List of uploaded documents (receipts, PDFs) with download links
- Organizer: upload button (file picker) + title field
- Members: view-only with download links
- Delete button for organizer

---

## 7. Tab Switching for "Go to Fund"

### Changes to `TripDashboard.tsx`:
- Convert `Tabs` from uncontrolled (`defaultValue`) to controlled (`value` + `onValueChange`)
- Pass `setActiveTab` to `PlanTab` so the "Go to Fund" button can switch tabs programmatically

---

## 8. Files to Create/Modify

### New Files
- `src/components/OrganizerBookingCard.tsx` - Booking status/link/receipt card per category
- `src/components/TripDocumentsCard.tsx` - Upload/view receipts and docs

### Modified Files
- `src/components/tabs/PlanTab.tsx` - Locked/unlocked states, organizer booking cards, "Go to Fund" CTA
- `src/components/tabs/FundTab.tsx` - "How this works" card + Stripe note
- `src/components/tabs/OverviewTab.tsx` - Clarity lines under funding + trip details
- `src/components/overview/TripDetailsCard.tsx` - "Per-person share updates automatically" line
- `src/components/tabs/SettingsTab.tsx` - Trip Documents section
- `src/pages/TripDashboard.tsx` - Controlled tab state, pass tab switcher to PlanTab

---

## 9. Microcopy (exact text)

**Locked banner:**
- "Bookings unlock at 100% funded."
- "Once funded, the organizer will book everything and share confirmations here."

**Locked category hint:**
- "Fund the trip to unlock planning details and booking assignments."

**Unlocked banner:**
- "Bookings Unlocked"
- "Organizer books. Everyone stays in sync."

**Fund tab "How this works":**
- "Everyone pays their share into the trip pool."
- "When the trip hits 100% funded, bookings unlock."
- "The organizer books flights/stay/experiences and posts confirmations and receipts here."
- "Your payment is processed by Stripe. We never store your card details."

**Overview - Group Funding:**
- "Unlocks planning and booking checklist at 100% funded."

**Overview - Per Person:**
- "Per-person share updates automatically as members join."

---

## 10. Logic Summary

All conditional rendering uses existing computed values from `useTripDashboard`:

```text
isFullyFunded = dashboard.funded_percent >= 1
isOrganizer = dashboard.current_user?.role === "organizer"
```

- `!isFullyFunded` --> locked Plan UI + "Go to Fund" button
- `isFullyFunded` --> unlocked Plan UI + organizer booking cards
- `isOrganizer` --> can edit booking cards and upload receipts
- `!isOrganizer` --> read-only view of booking cards and documents

