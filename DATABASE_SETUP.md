# Database Setup Instructions

## Missing Tables Error Fix

If you're seeing errors about missing tables like `public.saved_trends` or `public.trend_user_votes`, you need to run the SQL migration.

### Steps to Fix:

1. **Go to your Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the entire contents of `CREATE_SAVED_TRENDS_TABLE.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should now see:
     - `saved_trends` table
     - `trend_user_votes` table

5. **Clear Browser Cache**
   - Hard refresh your app (Cmd/Ctrl + Shift + R)
   - This ensures the new tables are recognized

## What These Tables Do:

- **saved_trends**: Stores trends that users save to their timeline with reactions (wave, fire, decline, death)
- **trend_user_votes**: Tracks which trends users have voted on to prevent duplicate voting

## Troubleshooting:

If you still see errors after running the migration:

1. Check that Row Level Security (RLS) is enabled on both tables
2. Verify that the policies were created correctly
3. Make sure your user has the `authenticated` role
4. Try signing out and back in to refresh your session

## Note for Production:

These tables should be created as part of your database migrations in production. Consider using Supabase CLI for managing migrations:

```bash
supabase migration new create_saved_trends
# Then add the SQL to the generated migration file
supabase db push
```