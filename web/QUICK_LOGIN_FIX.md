# Quick Login Fix

## The Issue
- Email confirmation is required by Supabase
- Users can't login until they confirm their email

## Solutions

### Option 1: Disable Email Confirmation (Recommended for Development)
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo
2. Navigate to Authentication > Providers > Email
3. Toggle OFF "Confirm email"
4. Save changes

### Option 2: Manually Confirm Test User
Run this SQL in Supabase SQL Editor:
```sql
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'testuser@wavesight.com';
```

### Option 3: Use Magic Link (No Password)
Already implemented in the app - users can request a magic link to login without password.

## Test Account Created
- Email: `testuser@wavesight.com`
- Password: `TestUser123!`
- Username: `testuser`

## Production Recommendation
For production, keep email confirmation enabled but provide clear messaging to users about checking their email.