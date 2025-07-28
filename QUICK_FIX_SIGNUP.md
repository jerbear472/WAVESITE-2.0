# Quick Fix for Signup Issues

The error `"profiles" is not a view` means you already have a `profiles` table. This is good! We just need to ensure it has all the required columns.

## Step 1: Check Your Current Structure

First, run `check-database-structure.sql` in Supabase SQL Editor to see what you have:
```sql
-- This will show you:
-- 1. What tables exist (profiles, user_profiles, etc.)
-- 2. What columns the profiles table has
-- 3. How many users exist
-- 4. Any users missing profiles
```

## Step 2: Apply the Simple Fix

Run `simple-fix-profiles.sql` which:
- Adds any missing columns to the existing profiles table
- Doesn't drop or lose any data
- Updates the trigger to handle new signups properly
- Ensures usernames are set for existing users

## Step 3: Complete the Setup

Run the remaining parts from `fix-signup-issues-v2.sql`:
- Creates user_settings table
- Creates user_account_settings table  
- Creates the get_user_dashboard_stats function
- Sets up proper RLS policies

## Quick Test

After running the SQL scripts, test a new signup:

1. **Web**: Go to `/register` and create a new account
2. **Mobile**: Use the registration screen with birthday field

The user should be created with:
- Entry in auth.users
- Entry in profiles table with all fields
- Birthday and age verification working
- Email confirmation (if enabled)

## If You Still Get Errors

1. **"duplicate key value violates unique constraint"**
   - The email/username already exists
   - Use a different email or delete the existing user

2. **"relation profiles does not exist"**
   - The profiles table might be in a different schema
   - Check with: `SELECT * FROM information_schema.tables WHERE table_name = 'profiles'`

3. **Profile not created after signup**
   - Check if the trigger is enabled
   - Manually insert a test profile to verify permissions

## Emergency Alternative

If the profiles table is problematic, you can rename it and start fresh:
```sql
-- Backup existing data
ALTER TABLE public.profiles RENAME TO profiles_backup;

-- Create new profiles table with all fields
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    birthday DATE,
    age_verified BOOLEAN DEFAULT FALSE,
    subscription_tier TEXT DEFAULT 'starter',
    -- ... rest of fields from schema
);

-- Copy data from backup
INSERT INTO public.profiles 
SELECT * FROM profiles_backup;

-- Drop backup when verified working
-- DROP TABLE profiles_backup;
```

The key is ensuring the `profiles` table has all the columns the app expects!