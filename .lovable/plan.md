

# Invite Code, Member Management, and Budget Replan AI

## What This Adds

### 1. Invite Code in Overview Tab
Display the trip's invite code prominently in the Overview tab so everyone can see and share it. Includes a copy button for easy sharing.

### 2. Organizer Member Management (Overview Tab)
The organizer gets controls right in the Overview tab to:
- Add members by email (looks up their profile, adds them to `trip_members`, creates a payment record)
- Remove members
- See the full headcount (X of Y spots filled)
- Assign roles (mark someone as co-organizer)

### 3. Budget Replan Feature (Overview Tab)
When the trip is underfunded (e.g. $10k collected out of $12k needed, 60 days out), a "Budget Alert" card appears in the Overview tab showing:
- The funding shortfall amount
- A "Replan on This Budget" button that opens an AI chatbot dialog
- The AI chatbot (powered by Lovable AI / Gemini) helps re-plan the trip based on the actual collected amount -- suggesting cheaper hotels, alternative activities, flight changes, etc.
- The chat is a simple dialog/sheet overlay, not a separate tab

## Technical Details

### Overview Tab Changes (`src/components/tabs/OverviewTab.tsx`)

**Invite Code Section** (new card after Trip Details):
- Shows `trip.invite_code` with a copy-to-clipboard button
- Available to all trip members

**Member Management** (enhanced Members card, organizer-only controls):
- "Add Member" button that expands an email input
- Lookup user by email from `profiles` table (need to query by a match -- but profiles don't have email; emails are in `auth.users` which we can't query client-side)
- Alternative approach: Add member by invite code sharing (already works via Onboarding) OR add an edge function that looks up a user by email
- For removing members: small X button next to each member (organizer only)
- Role badge toggle: tap to switch between "member" and "organizer" (organizer only)

**Budget Alert Card** (conditional, shows when underfunded):
- Calculates shortfall = total owed - total paid
- Shows when funding < 100% and trip is within 90 days
- "Replan with ${totalPaid}" button opens AI chat dialog

### New Edge Function: `replan-chat`
- Accepts conversation history + trip context (destination, dates, current budget, original budget, member count)
- Calls Gemini 2.5 Flash via Lovable AI
- System prompt: "You are a travel budget advisor. The group originally planned a ${original} trip to {destination} but only has ${actual} collected. Help them replan to fit the new budget with specific, actionable suggestions."
- Returns AI response

### New Edge Function: `lookup-user-by-email`
- Accepts email string
- Uses service role key to query `auth.users` for the email
- Returns `user_id` and display name from profiles
- Only callable by authenticated users who are organizers of a trip

### New Component: `src/components/ReplanChat.tsx`
- Dialog/Sheet overlay with a simple chat interface
- Sends messages to `replan-chat` edge function
- Renders AI responses with markdown
- Pre-populates with trip context so the AI knows the situation immediately

### Database Changes

**Add `trip_members` UPDATE policy** (currently missing):
```sql
CREATE POLICY "Organizers can update members"
ON public.trip_members FOR UPDATE
USING (is_trip_organizer(auth.uid(), trip_id));
```

This allows organizers to change a member's role.

### Files Changed

| File | Change |
|---|---|
| `src/components/tabs/OverviewTab.tsx` | Add invite code card, organizer member controls, budget alert card with replan button |
| `src/components/ReplanChat.tsx` | New -- AI chat dialog for budget replanning |
| `supabase/functions/replan-chat/index.ts` | New -- Edge function calling Gemini for replan suggestions |
| `supabase/functions/lookup-user-by-email/index.ts` | New -- Edge function to find user by email for organizer to add members |
| Database migration | Add UPDATE policy on `trip_members` for organizers |

### User Flow

1. **Sharing**: Any member opens Overview tab, sees invite code, taps "Copy" to share with friends
2. **Adding members**: Organizer types an email in the "Add Member" input, the system finds the user and adds them
3. **Budget shortfall**: When funding is behind, a prominent card appears: "You're $2,000 short. Want help replanning?" Tapping it opens a chat where AI suggests specific cuts and alternatives
4. **AI chat example**: "Your group has $10,000 instead of $12,000 for Cancun. Here's how to make it work: Switch from the all-inclusive resort ($200/night) to a beachfront Airbnb ($120/night) -- saves $1,600 across 4 nights for 4 people..."

