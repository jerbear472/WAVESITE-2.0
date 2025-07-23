# WaveSight Share Extension Guide

## Overview

The WaveSight Share Extension allows users to share trending content directly from social media apps (TikTok, Instagram, YouTube) to WaveSight for analysis and tracking.

## How It Works

### For Users

1. **Browse Social Media**: Use TikTok, Instagram, or YouTube normally
2. **Find Trending Content**: When you see something trend-worthy
3. **Share to WaveSight**: 
   - Tap the share button in the social media app
   - Select "WaveSight" from the share sheet
   - The app will open with the shared content ready to capture

### Technical Flow

1. **Share Extension Activated**: When user selects WaveSight from share sheet
2. **URL Extraction**: Extension extracts URL, title, and platform information
3. **Data Storage**: Information saved to shared App Group container
4. **Deep Link**: Opens WaveSight app with `wavesight://capture?url=...`
5. **Auto-Population**: App receives shared data and pre-fills capture form

## Supported Platforms

- **TikTok**: Videos, profiles
- **Instagram**: Posts, Reels, Stories
- **YouTube**: Videos, Shorts
- **Other**: Any URL can be shared and manually categorized

## Features

### Automatic Detection
- Platform detection from URL patterns
- Content ID extraction for future API integration
- Thumbnail URL generation (YouTube only currently)

### Metadata Extraction
- Video/Post title (when available)
- Author/Username (from URL patterns)
- Platform-specific content IDs
- Timestamp of capture

### Error Handling
- Duplicate URL prevention
- Invalid URL validation
- User-friendly error messages
- Fallback for unsupported platforms

## Data Storage

Captured trends are stored in Supabase with:
- URL (normalized, tracking params removed)
- Platform identification
- User-provided title and description
- Hashtags (cleaned and deduplicated)
- Metadata JSON object with additional info
- Capture method (manual vs share_extension)

## Privacy & Security

- No screen recording or invasive tracking
- Only captures links user explicitly shares
- Data stored securely in user's account
- Row-level security ensures data privacy

## Future Enhancements

1. **API Integration**: Connect to platform APIs for richer metadata
2. **Video Preview**: Generate and store video thumbnails
3. **Batch Capture**: Share multiple items at once
4. **Analytics**: Track engagement metrics over time
5. **Export**: Export captured trends in various formats