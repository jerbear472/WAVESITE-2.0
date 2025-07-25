# Fix Submit Trend Button - Setup Instructions

## Issue
The Submit Trend button in WaveSite is not working because the `trend-images` storage bucket doesn't exist in Supabase. When users try to submit a trend with an image, the upload fails.

## Solution

### 1. Create the Storage Bucket in Supabase

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `achuavagkhjenaypawij`
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Enter the following:
   - Bucket name: `trend-images`
   - Public bucket: ✅ (check this box)
6. Click **Create bucket**

#### Option B: Via SQL Editor
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the SQL file created: `/supabase/create_trend_images_bucket.sql`
   ```sql
   -- Run this entire file in the SQL editor
   ```

### 2. Verify the Setup

To verify the bucket was created successfully:

1. In Supabase Dashboard, go to **Storage**
2. You should see `trend-images` in the list of buckets
3. Click on the bucket to verify it's public and accessible

### 3. Test the Submit Trend Button

1. Start the development server:
   ```bash
   cd web
   npm run dev
   ```

2. Navigate to http://localhost:3000/submit

3. Test the submission flow:
   - Click "Submit New Trend"
   - Fill in the URL and title
   - Add a category and platform
   - Upload an image (optional)
   - Submit the trend

### 4. Troubleshooting

If the submit button still doesn't work:

#### Check Browser Console
1. Open browser developer tools (F12)
2. Look for any errors in the Console tab
3. Common errors:
   - `storage bucket not found` - Bucket wasn't created properly
   - `permission denied` - Storage policies need to be applied
   - `network error` - Check Supabase URL and API key

#### Verify Environment Variables
Ensure your `/web/.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://achuavagkhjenaypawij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Check User Authentication
The submit feature requires users to be logged in:
1. Ensure you're logged in (check for user session)
2. If not logged in, register/login first at `/login`

### 5. Additional Fixes Applied

The following components handle trend submission:
- `/web/components/TrendSubmissionForm.tsx` - Desktop form
- `/web/components/MobileTrendSubmission.tsx` - Mobile form
- `/web/app/submit/page.tsx` - Submit page that uses both forms
- `/backend/app/api/v1/trends.py` - Backend API endpoint

All these components are configured correctly. The only missing piece was the storage bucket.

### 6. Mobile App Configuration

For the React Native mobile app, the trend submission also works once the bucket is created:
- `/mobile/src/screens/TrendCaptureScreen.tsx`
- `/mobile/src/services/TrendStorageService.ts`

No changes needed in the mobile app - it uses the same Supabase configuration.

## Summary

The submit trend button will work properly once you:
1. ✅ Create the `trend-images` storage bucket in Supabase
2. ✅ Ensure you're logged in when submitting
3. ✅ Have proper environment variables configured

The trend submission flow is:
1. User fills out the form (URL, title, description, category, platform)
2. Optional: User uploads an image
3. Form validates the data
4. Image uploads to `trend-images` bucket (if provided)
5. Trend data saves to `trend_submissions` table
6. User redirected to dashboard with success message

## Next Steps

After fixing the storage bucket:
1. Test trend submission with and without images
2. Verify trends appear in the database
3. Check if validation flow works for submitted trends
4. Monitor for any other issues in production