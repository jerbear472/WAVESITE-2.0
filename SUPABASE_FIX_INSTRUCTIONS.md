# Supabase Login Fix Instructions

## Problem Identified
The Supabase project URL `https://aicahushpcslwjwrlqbo.supabase.co` is not accessible, which is causing the login functionality to fail.

## Solution Required

You need to create a new Supabase project or use an existing one. Here's how to fix it:

### Option 1: Create a New Supabase Project (Recommended)

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com
   - Sign in or create an account
   - Click "New Project"

2. **Create Your Project**
   - Project name: `wavesight` (or any name you prefer)
   - Database Password: Choose a strong password
   - Region: Choose the closest to your location
   - Wait for the project to be created (takes about 2 minutes)

3. **Get Your Project Credentials**
   - Once created, go to Settings → API
   - Copy the following:
     - Project URL (looks like: `https://xxxxx.supabase.co`)
     - Anon/Public Key
     - Service Role Key (keep this secret!)

4. **Update Your Configuration Files**

   Update `/Users/JeremyUys_1/Desktop/freewavesight/.env`:
   ```env
   SUPABASE_URL=your_new_project_url
   SUPABASE_ANON_KEY=your_new_anon_key
   SUPABASE_SERVICE_KEY=your_new_service_key
   ```

   Update `/Users/JeremyUys_1/Desktop/freewavesight/web/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_new_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_new_service_key
   ```

   Update `/Users/JeremyUys_1/Desktop/freewavesight/web/lib/supabase.ts`:
   ```typescript
   const supabaseUrl = 'your_new_project_url';
   const supabaseAnonKey = 'your_new_anon_key';
   ```

5. **Set Up Database Tables**
   - Go to SQL Editor in your Supabase Dashboard
   - Run the SQL migrations from the project (check the .sql files in the root directory)
   - Start with creating the profiles and user tables

### Option 2: Use the Existing Project (If You Have Access)

If the project `aicahushpcslwjwrlqbo` belongs to you:

1. Check if you're logged into the correct Supabase account
2. Verify the project still exists at https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo
3. If it was paused due to inactivity, restore it
4. If it was deleted, you'll need to create a new one (Option 1)

### Option 3: Local Development with Supabase CLI

For local development without creating a cloud project:

1. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Initialize local Supabase:
   ```bash
   cd /Users/JeremyUys_1/Desktop/freewavesight
   supabase init
   supabase start
   ```

3. This will give you local URLs and keys to use

## After Fixing Supabase

1. Restart your development server
2. Clear browser cache and cookies
3. Try logging in again

## Test Account Creation

Once Supabase is working, create a test account:

1. Go to http://localhost:3003/register
2. Sign up with a test email
3. Confirm the email (check Supabase Dashboard → Authentication → Users)
4. Try logging in at http://localhost:3003/login

## Need Help?

If you're having trouble setting up Supabase:
- Check Supabase documentation: https://supabase.com/docs
- Make sure you have a stable internet connection
- Ensure all environment variables are correctly set
- Check the browser console for specific error messages