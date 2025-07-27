# Social Media Metadata Update Instructions

## Overview
This update adds automatic extraction of social media metadata when submitting trends. When you paste a URL, the form will automatically fill with:
- Creator handle and name
- Post caption
- Like, comment, share, and view counts
- Hashtags
- Thumbnail

## Database Setup
Run this SQL in your Supabase SQL editor to ensure all columns exist:

```sql
-- Check if columns already exist, add if missing
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
```

## Files Updated
1. **`web/lib/metadataExtractor.ts`** - New service for extracting metadata from URLs
2. **`web/components/TrendSubmissionForm.tsx`** - Updated to use metadata extractor
3. **`web/components/MobileTrendSubmission.tsx`** - Updated to use metadata extractor
4. **`web/app/(authenticated)/timeline/page.tsx`** - Already displays metadata if present
5. **`web/app/(authenticated)/submit/page.tsx`** - Already saves metadata to database

## How It Works
1. User pastes a social media URL
2. The metadata extractor detects the platform (TikTok, Instagram, YouTube, Twitter/X)
3. It attempts to extract metadata:
   - First from URL patterns (e.g., @username from TikTok URLs)
   - Then from a backend API (if available)
   - Falls back to realistic mock data for testing
4. The form auto-fills with the extracted data
5. User can edit any field before submitting
6. All metadata is saved to the database and displayed on the Timeline page

## Testing
1. Go to Submit page
2. Paste a social media URL (e.g., `https://www.tiktok.com/@username/video/123`)
3. Watch the form auto-fill with metadata
4. Submit the trend
5. Go to My Timeline page
6. Verify all metadata is displayed (creator, caption, stats, hashtags)

## Future Enhancements
- Implement actual backend API for real metadata extraction
- Add support for more platforms
- Extract actual thumbnails from posts
- Real-time validation of URLs