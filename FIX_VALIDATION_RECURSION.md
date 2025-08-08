# Fix for Trend Validations Infinite Recursion Error

## Problem
The verify page shows "Error: infinite recursion detected in policy for relation 'trend_validations'" because the RLS (Row Level Security) policies have circular dependencies or self-references.

## Solution

### Run this SQL in your Supabase Dashboard:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project
   - Open the SQL Editor

2. **Copy and run the contents of `fix-validation-recursion.sql`**

This script will:
- Disable RLS temporarily
- Remove ALL existing policies (which have the recursion issue)
- Re-enable RLS
- Create new, simple, non-recursive policies:
  - `view_all_validations`: Anyone can view validations
  - `insert_own_validations`: Users can insert their own validations
  - `update_own_validations`: Users can update their own validations
  - `delete_own_validations`: Users can delete their own validations

## Why This Happens
Infinite recursion in RLS policies typically occurs when:
1. A policy references itself indirectly
2. Multiple policies create a circular dependency
3. A policy's WHERE clause triggers another policy check that loops back

## The Fix
The new policies are simple and direct:
- No complex joins or subqueries
- No references to other tables that might have their own RLS policies
- Clear, simple auth checks using `auth.uid()`

## Testing
After applying the fix:
1. Go to the `/verify` page
2. The page should load without the recursion error
3. You should be able to validate trends normally

## Alternative Quick Fix (if the above doesn't work)
If you still get errors, you can temporarily disable RLS as a test:

```sql
-- TEMPORARY: Disable RLS to test
ALTER TABLE public.trend_validations DISABLE ROW LEVEL SECURITY;
```

Then re-enable it after fixing the policies:

```sql
-- Re-enable RLS after fixing
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;
```