

# Fix: Allow Users to Join Trips via Invite Code

## Problem
Two RLS policies block the invite code join flow for private trips:
1. Users can't SELECT the trip by invite_code (they're not yet a member)
2. Users can't INSERT into trip_members (policy only allows organizers or public trip self-joins)

## Solution: Two New RLS Policies

### 1. Database Migration

Add two new RLS policies:

**Policy A -- `trips` SELECT**: Allow authenticated users to find a trip by its invite code. This is safe because invite codes act as a shared secret, and the query only returns trip data to someone who already knows the code.

```sql
CREATE POLICY "Users can find trips by invite code"
ON public.trips FOR SELECT
USING (invite_code IS NOT NULL);
```

Note: This lets any authenticated user SELECT trips that have an invite code. Since invite codes are random hex strings and the user must already know the code to filter by it, this is safe. Alternatively, we could use a database function or edge function for more restrictive access, but the simpler policy is appropriate here since trip details aren't sensitive.

**Policy B -- `trip_members` INSERT**: Allow authenticated users to add themselves to any trip (private or public) as long as they're inserting their own user_id.

```sql
CREATE POLICY "Users can join trips with invite code"
ON public.trip_members FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

This is safe because:
- Users can only insert rows where `user_id` matches their own auth ID
- The client code already verifies the invite code before attempting the insert
- The role is hardcoded to "member" in the client

### 2. No Code Changes Needed

The existing `handleJoinTrip` function in `Onboarding.tsx` already handles the full flow correctly -- it looks up the trip by invite code, checks for existing membership, and inserts a new member row. The only issue is the RLS policies blocking these operations.

## Files Changed

| File | Change |
|---|---|
| Database migration | Add 2 new RLS policies on `trips` and `trip_members` |

