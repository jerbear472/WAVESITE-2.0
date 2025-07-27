# Resolve Duplicate User Email Error

## Error Details
```
ERROR: 23505: duplicate key value violates unique constraint "users_email_partial_key"
DETAIL: Key (email)=(test@wavesight.app) already exists.
```

## What This Means
A user with the email `test@wavesight.app` already exists in your database. This can happen when:
1. You previously created a test user
2. The user registration was partially completed
3. There are orphaned records from previous tests

## Quick Solutions

### Option 1: Check What Exists (Recommended First Step)
Run this in Supabase SQL Editor:
```sql
SELECT 
    id, 
    email, 
    username,
    created_at,
    subscription_tier
FROM public.profiles 
WHERE email = 'test@wavesight.app';
```

### Option 2: Use the Existing User
If the user already exists, you can:
1. **Login with existing credentials** instead of creating a new account
2. **Reset the password** if you don't remember it
3. **Use this existing user** for testing

### Option 3: Delete the Existing User (Careful!)
⚠️ **Only do this if you're sure you want to delete the test user**
```sql
-- This will permanently delete the user and all their data
DELETE FROM public.profiles WHERE email = 'test@wavesight.app';
DELETE FROM auth.users WHERE email = 'test@wavesight.app';
```

### Option 4: Create a Different Test User
Use a different email address:
- `test2@wavesight.app`
- `demo@wavesight.app`
- `your-email+test@gmail.com`

### Option 5: Update the Existing User
If you want to modify the existing user:
```sql
UPDATE public.profiles 
SET 
    username = 'updated_test_user',
    subscription_tier = 'enterprise'  -- or whatever tier you need
WHERE email = 'test@wavesight.app';
```

## Prevention
To avoid this in the future:
1. **Check for existing users** before creating new ones
2. **Use unique test emails** for each test scenario
3. **Clean up test data** regularly
4. **Use email aliases** like `your-email+test1@gmail.com`

## For Testing the Submit Button
Since you're working on the submit functionality, you can:
1. **Use the existing test user** to test trend submissions
2. **Create a new user** with a different email
3. **Login with your main account** to test

The submit button functionality should work with any authenticated user - the important part is that the user exists in the `profiles` table and can be referenced by `trend_submissions.spotter_id`.

## Next Steps
1. Run the SQL query to see what user data exists
2. Decide whether to use, update, or delete the existing user
3. Test the submit trend functionality with the chosen user
4. If still having issues, check the browser console for errors

The duplicate email error is unrelated to the submit button functionality - it's just a user management issue that's easy to resolve!