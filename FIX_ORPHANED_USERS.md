# Fix for Orphaned Auth Users (No Profiles)

## The Problem
You have users in `auth.users` without corresponding profiles:
- User `wavesight0@gmail.com` exists in auth.users
- But has no profile (profile_id is null)
- This breaks the app when it tries to load user data

## Quick Fix Steps

### 1. First, ensure profiles table has all columns
Run `ensure-profiles-columns.sql`:
```sql
-- This adds any missing columns to profiles table
-- Safe to run multiple times
```

### 2. Create missing profiles
Run `fix-missing-profiles.sql`:
```sql
-- This creates profiles for all orphaned auth users
-- Also creates user_settings and user_account_settings
```

### 3. Verify the fix
After running both scripts, check:
```sql
-- Should return 0 missing profiles
SELECT COUNT(*) as missing_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

## For Future Signups

The trigger should prevent this, but if it happens again:

### Option 1: Fix the trigger
```sql
-- Ensure trigger fires on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Option 2: Add a backup trigger on login
```sql
-- This ensures profile exists when user logs in
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username)
    VALUES (
        NEW.id, 
        NEW.email,
        split_part(NEW.email, '@', 1) || '_' || substring(NEW.id::text, 1, 4)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_profile_on_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_exists();
```

## Testing After Fix

1. Try logging in with `wavesight0@gmail.com`
2. Create a new user account
3. Both should work without errors

## Prevention

To prevent orphaned users:
1. Always use the signup function that creates both auth user and profile
2. Monitor for orphaned users regularly
3. Consider a scheduled job to fix orphaned users automatically

The key issue was the auth user existed but had no profile, which the app requires!