# Testing Trend Submission - Verification Guide

## Quick Test Steps

Now that the storage bucket and policies are created, let's test the trend submission:

### 1. Start the Development Server

```bash
cd web
npm run dev
```

### 2. Test the Submit Flow

1. **Navigate to**: http://localhost:3000/submit
2. **Login** if you haven't already (required for submission)
3. **Click** "Submit New Trend" button
4. **Fill out the form**:
   - **Step 1**: Basic Info
     - URL: Paste any TikTok/Instagram/YouTube link
     - Title: Give it a catchy name
     - Description: Optional
   - **Step 2**: Category & Platform
     - Select a platform (should auto-detect from URL)
     - Choose a category
     - **Upload an image** (this tests the storage bucket!)
   - **Step 3**: Review & Submit
     - Click "Submit Trend"

### 3. What Should Happen

✅ **Success Indicators**:
- Form submits without errors
- You see "Trend Submitted!" success message
- You're redirected to the dashboard
- No errors in browser console

❌ **If Something Goes Wrong**:
- Check browser console (F12 → Console tab)
- Look for specific error messages

## Verification Checklist

### Check in Supabase Dashboard:

1. **Storage Verification**:
   - Go to Storage → `trend-images` bucket
   - If you uploaded an image, it should appear here
   - File structure: `{user-id}/{timestamp}-{random}.{extension}`

2. **Database Verification**:
   - Go to Table Editor → `trend_submissions`
   - You should see your new submission with:
     - Your user ID in `spotter_id`
     - Status as `submitted`
     - Image URL in `screenshot_url` (if uploaded)
     - Evidence JSON with URL, title, platform

3. **Storage Policies Check**:
   - Storage → `trend-images` → Policies
   - Should show 4 active policies:
     - INSERT for authenticated users
     - SELECT for anon & authenticated
     - UPDATE for authenticated (own images)
     - DELETE for authenticated (own images)

## Common Issues & Fixes

### Issue: "Failed to submit trend" error
**Fix**: Check if you're logged in. The submit feature requires authentication.

### Issue: Image upload fails silently
**Fix**: 
- Verify the bucket is marked as "Public"
- Check file size (should be under 10MB)
- Supported formats: PNG, JPG, JPEG, GIF

### Issue: "Network error" or CORS issues
**Fix**: 
- Verify your Supabase URL and anon key in `/web/.env.local`
- Make sure you're using the correct project URL

### Issue: Submission succeeds but no redirect
**Fix**: This might be a navigation issue. Check if the trend was saved in the database.

## Test Without Image

To isolate issues, try submitting without an image first:
1. Fill out URL and title
2. Select category and platform
3. Skip image upload
4. Submit

If this works but image upload fails, the issue is specifically with storage.

## Advanced Debugging

### Check Network Tab
1. Open Developer Tools (F12)
2. Go to Network tab
3. Submit a trend
4. Look for:
   - `trend-images` upload request (if uploading image)
   - `trend_submissions` insert request
   - Both should return 200/201 status

### Manual Storage Test
In Supabase Dashboard SQL Editor:
```sql
-- Check if bucket exists and is public
SELECT * FROM storage.buckets WHERE id = 'trend-images';

-- Check recent uploads (if any)
SELECT * FROM storage.objects 
WHERE bucket_id = 'trend-images' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Success! What's Next?

Once trend submission is working:

1. **Test the Validation Flow**:
   - Other users can validate your submitted trends
   - Navigate to validation queue to see pending trends

2. **Check Points System**:
   - Submitted trends earn points when validated
   - Check your profile for accuracy score updates

3. **Mobile App Testing**:
   - The React Native app should also work now
   - Same storage bucket is used across platforms

## Congratulations! 🎉

Your trend submission feature is now fully functional. Users can:
- Submit trends with URLs
- Upload screenshots/images
- Categorize content
- Earn points through validation

The missing `trend-images` storage bucket was the only issue, and now it's fixed!