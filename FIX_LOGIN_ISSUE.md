# Fix Login Issue - Quick Solution

## The Problem
The authentication system was looking for `user_profiles` table but we have `profiles` table.

## The Fix Applied
✅ Updated AuthContext.tsx to use `profiles` table instead of `user_profiles`

## To Complete the Fix

### 1. Apply the SQL Fix in Supabase
Go to your [Supabase SQL Editor](https://app.supabase.com/project/achuavagkhjenaypawij/sql) and run:

```sql
-- Create a view that maps profiles to user_profiles (for compatibility)
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    id,
    email,
    username,
    full_name,
    avatar_url,
    bio,
    subscription_tier,
    created_at,
    updated_at,
    'participant' as role,
    0 as total_earnings,
    0 as pending_earnings,
    0 as trends_spotted,
    0 as accuracy_score,
    0 as validation_score,
    'user' as view_mode
FROM profiles;

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;
```

### 2. Refresh the Page
Since the AuthContext was updated while the app was running, you need to:

1. **Hard refresh the browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
2. **Or open in a new incognito window**

### 3. Try Logging In Again
- Go to: http://localhost:3000/login
- Email: `enterprise@test.com`
- Password: `test123456`

## If Login Still Fails

### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages when you click "Sign in"

### Check if User Exists
Run this in Supabase SQL Editor:
```sql
-- Check auth users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'enterprise@test.com';

-- Check profiles
SELECT * FROM profiles 
WHERE email = 'enterprise@test.com';
```

### Create New Test User
If the user doesn't exist, run:
```bash
node create-test-enterprise-user.js
```

## Alternative Quick Fix

If you're still having issues, try registering a new user:
1. Go to http://localhost:3000/register
2. Create a new account
3. Then run this SQL to make them enterprise:
```sql
UPDATE profiles 
SET subscription_tier = 'enterprise' 
WHERE email = 'your-new-email@example.com';
```

## Success Indicators
✅ No errors in browser console
✅ After login, redirected to dashboard
✅ Can see enterprise features

The authentication is now properly configured to work with your database schema!