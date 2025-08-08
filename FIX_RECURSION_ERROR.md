# Fix for "Infinite Recursion Detected" Error

## Problem
The error "infinite recursion detected in policy for relation 'trend_validations'" occurs when Row Level Security (RLS) policies reference each other in a circular way, causing an infinite loop.

## Solution

### Step 1: Apply the SQL Fix
Run the following SQL in your Supabase Dashboard SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `fix-validation-recursion-policy.sql`
4. Click "Run"

This SQL script will:
- Remove all existing RLS policies that cause recursion
- Create new, simpler policies that don't reference each other
- Add a new RPC function `submit_trend_validation` that bypasses RLS complexity
- Ensure proper permissions are set

### Step 2: Verify the Fix
After running the SQL, test the voting:

1. Go to the verify page in your app
2. Try to vote on a trend
3. Check the browser console for messages

You should see either:
- "Vote submitted successfully via RPC" (preferred)
- "Vote submitted successfully via direct insert" (fallback)

### Step 3: How It Works

The fix implements a two-pronged approach:

1. **Primary Method: RPC Function**
   - Uses `submit_trend_validation()` function
   - Runs with SECURITY DEFINER (elevated privileges)
   - Performs validation checks in the function
   - Avoids RLS policy recursion entirely

2. **Fallback Method: Direct Insert**
   - If RPC is not available, tries direct insert
   - Uses simplified RLS policies
   - No circular references between policies

### What Changed

#### Old (Problematic) Policies:
```sql
-- These caused recursion by referencing other tables/policies
CREATE POLICY "complex_policy" ON trend_validations
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE ...)
  AND NOT EXISTS (SELECT 1 FROM trend_validations WHERE ...)
);
```

#### New (Fixed) Policies:
```sql
-- Simple, direct checks without recursion
CREATE POLICY "allow_insert_own_validations" ON trend_validations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND validator_id = auth.uid()
);
```

### Troubleshooting

If you still get recursion errors:

1. **Check for other policies:**
   ```sql
   SELECT policyname, definition 
   FROM pg_policies 
   WHERE tablename = 'trend_validations';
   ```

2. **Ensure the RPC function exists:**
   ```sql
   SELECT proname 
   FROM pg_proc 
   WHERE proname = 'submit_trend_validation';
   ```

3. **Test the RPC function manually:**
   ```sql
   SELECT submit_trend_validation(
     'your-trend-id-here'::uuid,
     'verify',
     0.75
   );
   ```

### Prevention

To prevent this in the future:
- Keep RLS policies simple
- Avoid policies that reference other tables with their own RLS
- Use RPC functions for complex business logic
- Test policies thoroughly before deployment

## Summary

The recursion error is now fixed by:
1. Simplifying RLS policies to avoid circular references
2. Adding an RPC function that handles validation logic
3. Implementing a fallback mechanism in the frontend

After applying the fix, users can vote on trends without encountering the recursion error.