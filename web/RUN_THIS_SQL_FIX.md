# How to Fix the Validation "user_id" Error

The validation page error "record 'new' has no field 'user_id'" needs to be fixed in the database.

## Steps to Apply the Fix:

### Option 1: Using Supabase Dashboard (Easiest)

1. Open your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query** button
4. Copy ALL contents from the file `fix-validation-user-id-v2.sql`
5. Paste it into the SQL editor
6. Click **Run** button
7. You should see success messages in the output

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# First, make sure you're in the web directory
cd /Users/JeremyUys_1/Desktop/wavesite2/web

# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project (replace YOUR_PROJECT_REF with your actual project reference)
# You can find this in your Supabase dashboard URL: https://app.supabase.com/project/YOUR_PROJECT_REF
npx supabase link --project-ref YOUR_PROJECT_REF

# Run the SQL fix
npx supabase db push < fix-validation-user-id-v2.sql
```

### Option 3: Manual SQL Execution

If the above methods don't work, you can run these commands manually in the SQL editor:

```sql
-- First, drop all versions of the problematic function
DO $$ 
DECLARE
    func_signature text;
BEGIN
    FOR func_signature IN 
        SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'cast_trend_vote'
        AND n.nspname = 'public'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.cast_trend_vote(%s)', func_signature);
    END LOOP;
END $$;

-- Then create the corrected function (see fix-validation-user-id-v2.sql for full function)
```

## What This Fix Does:

1. **Drops all versions** of the `cast_trend_vote` function (there are multiple conflicting versions)
2. **Creates a corrected version** that uses `validator_id` instead of `user_id`
3. **Updates vote counting logic** to properly track approvals and rejections
4. **Fixes the auto-approval/rejection** threshold logic

## After Running the Fix:

1. Test the validation page at `/validate`
2. Try approving or rejecting a trend
3. The "user_id" error should be gone
4. Validations should be recorded properly

## Alternative (Already Implemented):

The client-side code has already been updated to bypass the RPC function entirely and use direct database inserts. This works even without the SQL fix, but fixing the database function is cleaner.

## Need Help?

If you encounter issues:
1. Check the browser console for specific error messages
2. The client-side workaround (already implemented) should work regardless
3. You can also use the `create-simple-validation-function.sql` to create a new function with a different name