# WaveSight Testing Guide

## Testing the Share Extension

### Test 1: Manual Link Capture
1. Open WaveSight app
2. Go to the "Capture" tab (flag icon)
3. Copy this test link: `https://www.tiktok.com/@test/video/1234567890`
4. Tap "Paste Link" button
5. Verify:
   - Platform is auto-detected as "TikTok"
   - You can add title, description, and hashtags
   - Tapping "Capture" saves the trend
   - Success alert shows with "View" option

### Test 2: Direct Link Input
1. In the Capture tab, tap "Flag a Trend"
2. Manually enter: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. Verify:
   - Platform is detected as "YouTube"
   - Form fields work correctly
   - Capture succeeds

### Test 3: Share Extension (Physical Device)
**Note: Share extensions don't work in iOS Simulator. Use a physical device.**

1. Open Safari or any social media app
2. Navigate to a TikTok/Instagram/YouTube video
3. Tap the share button
4. Select "WaveSight" from the share sheet
5. Verify:
   - WaveSight opens with the shared URL
   - Platform is correctly detected
   - Capture modal appears automatically

### Test 4: Recent Captures
1. After capturing a few trends
2. Check the "Recent Captures" section
3. Verify:
   - Captured trends appear with correct platform icons
   - Tapping a trend opens the original link
   - Data persists after app restart

## Verifying Database Storage

### In Supabase Dashboard:
1. Go to https://app.supabase.com/project/achuavagkhjenaypawij
2. Navigate to "Table Editor"
3. Select "captured_trends" table
4. Verify captured trends appear with:
   - Correct user_id
   - Platform detection
   - Metadata JSON
   - Timestamps

### Check for:
- ✅ URL normalization (tracking params removed)
- ✅ Hashtag processing (cleaned and deduplicated)
- ✅ Platform-specific metadata
- ✅ Unique constraint prevents duplicate URLs

## Common Test URLs

### TikTok
- `https://www.tiktok.com/@zachking/video/7123456789123456789`
- `https://vm.tiktok.com/ZMN123456/`

### Instagram
- `https://www.instagram.com/reel/Abc123XyZ/`
- `https://www.instagram.com/p/Abc123XyZ/`

### YouTube
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`

## Troubleshooting

### Share Extension Not Appearing
1. Ensure app is installed on device (not simulator)
2. Go to Settings > WaveSight > Ensure permissions are enabled
3. Try restarting the device

### Database Errors
1. Check Supabase dashboard for RLS policies
2. Ensure user is authenticated
3. Check network connection

### Platform Not Detected
- The URL might be shortened or from an unsupported platform
- Check console logs for the actual URL being processed