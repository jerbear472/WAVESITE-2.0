# Real Data Capture Guide

## Current Status
The metadata extractor now:
- ✅ Extracts creator handle from URLs (when available)
- ✅ Detects the platform automatically
- ❌ Does NOT make up fake numbers for likes, comments, etc.
- ❌ Does NOT generate fake captions

## How to Capture Real Post Data

### Manual Entry (Current Method)
When submitting a trend, you need to manually enter the actual data from the post:

1. **Open the original post** in a new tab
2. **Copy the real numbers**:
   - Likes count
   - Comments count
   - Shares/Retweets count
   - Views count (if shown)
3. **Copy the actual caption** from the post
4. **Enter the creator's display name** (if different from handle)
5. **Copy relevant hashtags**

### Why Manual Entry?
Getting real-time data from social media platforms requires:
- Official API access (expensive and restricted)
- OAuth authentication (complex setup)
- Rate limits that prevent bulk extraction

## Future Options for Automatic Data Capture

### 1. Browser Extension
Create a browser extension that captures data while you're viewing the post:
- Runs on the actual social media page
- Has access to the DOM elements
- Can extract real numbers and captions

### 2. Backend API Service
Build a backend service that:
- Uses official APIs with proper authentication
- Caches data to respect rate limits
- Requires API keys for each platform

### 3. Screenshot + OCR
- User takes screenshot of the post
- OCR extracts text and numbers
- More complex but doesn't require API access

## For Now: Best Practices

1. **Always enter real data** - Don't guess or estimate
2. **Copy exact numbers** - If it shows "1.2M", enter 1200000
3. **Include the full caption** - This helps validators verify the trend
4. **Add all relevant hashtags** - Important for trend categorization

## Testing with Real Data

Example submission process:
1. Find a trending TikTok: `https://www.tiktok.com/@creator/video/123`
2. Open the link and note:
   - Views: 2.5M → Enter: 2500000
   - Likes: 450K → Enter: 450000
   - Comments: 12.3K → Enter: 12300
   - Caption: Copy the exact text
3. Submit with this real data

This ensures your trend submissions contain accurate information that validators can verify.