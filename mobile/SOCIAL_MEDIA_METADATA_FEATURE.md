# Social Media Metadata Feature

## Overview
Enhanced the trend capture functionality to extract and display comprehensive metadata from social media posts including creator information and engagement metrics.

## Database Changes

### Migration Required
Run the following migration to add the new columns:
```bash
# Run the SQL migration
/mobile/supabase/migrations/003_add_social_media_metadata.sql
```

### New Columns Added to `captured_trends` table:
- `creator_handle` (VARCHAR) - The @username of the content creator
- `caption` (TEXT) - Original caption/description from the post
- `like_count` (INTEGER) - Number of likes
- `view_count` (INTEGER) - Number of views
- `comment_count` (INTEGER) - Number of comments
- `share_count` (INTEGER) - Number of shares
- `save_count` (INTEGER) - Number of saves/bookmarks
- `thumbnail_url` (TEXT) - URL to thumbnail image
- `content_type` (VARCHAR) - Type of content (video, image, carousel, story)
- `duration_seconds` (INTEGER) - Duration for video content
- `posted_at` (TIMESTAMP) - When the content was originally posted
- `fetched_at` (TIMESTAMP) - When the metadata was fetched

## Code Changes

### 1. TrendCaptureService Updates
- Enhanced `TrendMetadata` interface with new fields
- Updated `CapturedTrend` interface to include all metadata fields
- Improved `getMockEnhancements()` to generate realistic engagement data
- Added `calculateEngagementScore()` method for scoring content virality
- Modified `captureTrend()` to save all metadata to database

### 2. UI Updates
- Updated `MyTrendsScreen` to display:
  - Creator handle with @ symbol
  - Original caption (prioritized over description)
  - Engagement metrics (views, likes, comments, shares)
  - Formatted numbers (e.g., 1.2M, 450K)

## Features

### Automatic Metadata Extraction
When a user shares a link:
1. Platform is detected (TikTok, Instagram, YouTube)
2. Creator handle is extracted from URL when possible
3. Mock engagement data is generated (until API integration)
4. Engagement score is calculated based on metrics

### Enhanced Display
- Creator handle shown prominently
- Caption displayed instead of generic description
- Engagement metrics with appropriate icons
- Numbers formatted for readability (K, M suffixes)

## Future Enhancements

### API Integration Needed
Currently using mock data. To get real data, integrate:
- TikTok API for video metrics
- Instagram Basic Display API
- YouTube Data API v3

### Backend Service
Create a backend service to:
1. Receive URLs from mobile app
2. Fetch real metadata using platform APIs
3. Return structured data to app
4. Cache results to avoid rate limits

## Usage

When capturing a trend:
1. Copy the social media post URL
2. Paste in the app
3. Metadata is automatically extracted
4. View full details in "My Trends" screen

The engagement score (0-100) helps identify potentially viral content based on the ratio of interactions to views.