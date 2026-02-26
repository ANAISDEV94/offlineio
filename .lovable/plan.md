

# Fix Authentication: Signup Flow and Password Reset

## Problems Found

1. **Signup misleads users**: Auto-confirm is enabled, so accounts are created and logged in instantly — but the code shows "Check your email" and doesn't navigate. Users sit waiting for an email that never arrives.

2. **No password reset**: Users who forget their password have no way to recover their account. They try signing up again (gets "already registered") and try wrong passwords (gets "Invalid login credentials") with no escape.

## Plan

### 1. Fix signup to navigate immediately (Auth.tsx)

Since auto-confirm is on, after a successful signup the session is created instantly. Change the signup handler to:
- Check if a session was returned (auto-confirm produces one)
- If yes: show a welcome toast and navigate to `/`
- If no session (email confirmation required): show the "check your email" toast

### 2. Add "Forgot password?" link (Auth.tsx)

Add a "Forgot your password?" button on the sign-in form that:
- Prompts for email
- Calls `supabase.auth.resetPasswordForEmail()` with redirect to `/reset-password`
- Shows a toast confirming the reset email was sent

### 3. Create a Reset Password page (new file: src/pages/ResetPassword.tsx)

- Detects `type=recovery` in the URL hash (set by the password reset link)
- Shows a form to enter a new password
- Calls `supabase.auth.updateUser({ password })` to save it
- Navigates to `/` on success

### 4. Add route for /reset-password (App.tsx)

Register the new `/reset-password` route as a public page.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Fix signup to navigate on auto-confirm; add forgot password UI |
| `src/pages/ResetPassword.tsx` | New page for setting a new password after reset link |
| `src/App.tsx` | Add `/reset-password` route |

