# Supabase Storage Setup for Trend Images

## Quick Fix via Supabase Dashboard

Since you encountered a permissions error when trying to create storage policies via SQL, here's how to fix it through the Supabase Dashboard:

### Step 1: Create the Storage Bucket

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Fill in:
   - Bucket name: `trend-images`
   - Public bucket: ✅ **Check this box** (Important!)
6. Click **Save**

### Step 2: Set Up Storage Policies

After creating the bucket:

1. Still in the Storage section, click on the `trend-images` bucket
2. Click on **Policies** tab
3. Click **New Policy** and create these 4 policies:

#### Policy 1: Allow Uploads (INSERT)
- **Policy name**: `Allow authenticated users to upload images`
- **Target roles**: `authenticated`
- **Operations**: `INSERT` ✅
- **WITH CHECK expression**: 
  ```sql
  true
  ```

#### Policy 2: Allow Public Viewing (SELECT)
- **Policy name**: `Allow public to view images`
- **Target roles**: `anon`, `authenticated` 
- **Operations**: `SELECT` ✅
- **USING expression**:
  ```sql
  true
  ```

#### Policy 3: Allow Updates (UPDATE)
- **Policy name**: `Allow users to update own images`
- **Target roles**: `authenticated`
- **Operations**: `UPDATE` ✅
- **USING expression**:
  ```sql
  auth.uid()::text = (storage.foldername(name))[1]
  ```

#### Policy 4: Allow Deletion (DELETE)
- **Policy name**: `Allow users to delete own images`
- **Target roles**: `authenticated`
- **Operations**: `DELETE` ✅
- **USING expression**:
  ```sql
  auth.uid()::text = (storage.foldername(name))[1]
  ```

### Step 3: Verify Setup

1. Go back to the main Storage page
2. You should see `trend-images` listed with "Public" status
3. Click on the bucket - you should see your 4 policies listed

### Alternative: RLS Policies via SQL

If you want to try SQL again, you can create RLS policies on the bucket level (not storage.objects):

```sql
-- This might work depending on your permissions
-- Run in SQL Editor

-- First, just create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trend-images', 'trend-images', true)
ON CONFLICT (id) DO NOTHING;
```

Then use the Dashboard UI to create the storage policies as described above.

## Testing the Fix

After setting up the bucket and policies:

1. Go to your app at http://localhost:3000/submit
2. Try submitting a trend with an image
3. Check the browser console for any errors
4. The image should upload successfully

## Common Issues

1. **"Bucket not found" error**: The bucket wasn't created. Double-check in Storage section.
2. **"Permission denied" error**: The policies weren't set up correctly. Review the policies.
3. **"Network error"**: Check your Supabase URL and anon key in `.env.local`

## Why This Happened

The original setup was missing the `trend-images` storage bucket. The app code expects this bucket to exist for uploading trend screenshots/images. Supabase storage policies require special permissions that regular database users don't have, which is why you need to use the Dashboard UI to create them.