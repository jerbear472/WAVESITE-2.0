# Real Post Data Extraction Implementation Guide

This guide shows how to implement real data extraction from Instagram and TikTok posts using WebView.

## Overview

The current implementation uses mock data. To get real post data, we need to:
1. Use a hidden WebView to load the social media post
2. Inject JavaScript to extract data from the DOM
3. Handle authentication for private posts

## Implementation Steps

### 1. Replace the Main App Component

Replace the current App.tsx with the enhanced version:
```bash
mv mobile/App.tsx mobile/App.backup.tsx
mv mobile/App.enhanced.tsx mobile/App.tsx
```

### 2. Add the PostDataExtractor Component

The `PostDataExtractor` component has been created at:
- `mobile/src/components/PostDataExtractor.tsx`

This component:
- Uses a hidden WebView to load Instagram/TikTok URLs
- Injects JavaScript to extract post data from the DOM
- Handles different selectors for each platform
- Returns extracted data including creator, caption, likes, comments, etc.

### 3. Update TrendCaptureScreen

A new `TrendCaptureScreen` has been created that:
- Includes the PostDataExtractor component
- Shows a UI for pasting URLs
- Displays extracted data in real-time
- Saves trends with full metadata

### 4. How It Works

#### Instagram Data Extraction:
```javascript
// Extracts from meta tags and DOM elements:
- Creator handle from links/spans
- Caption from meta descriptions or post text
- Likes/comments from button labels
- Thumbnail from img/video elements
- Hashtags parsed from caption
```

#### TikTok Data Extraction:
```javascript
// Extracts from JSON-LD and DOM:
- Creator from VideoObject schema
- Caption/description from structured data
- Engagement metrics from stat elements
- Music info from links
- Views/likes/comments/shares
```

### 5. Testing Instructions

1. **Test with Public Posts**:
   ```
   Instagram: https://www.instagram.com/p/ABC123/
   TikTok: https://www.tiktok.com/@username/video/123456
   ```

2. **Using the Capture Screen**:
   - Copy a post URL
   - Open the app and go to Capture Trends
   - Paste the URL
   - Click "Extract Post Data"
   - View the extracted information

3. **From Share Extension**:
   - In TikTok/Instagram, share a post
   - Select WaveSight from share menu
   - Data will be extracted automatically

## Limitations & Solutions

### Current Limitations:
1. **Private Posts**: May not extract data if not logged in
2. **Rate Limiting**: Platforms may block repeated requests
3. **DOM Changes**: Selectors may break when platforms update

### Production Solutions:

1. **Use Official APIs** (Recommended):
   - Instagram Basic Display API
   - TikTok Display API
   - Requires OAuth authentication

2. **Server-Side Extraction**:
   - Use Puppeteer/Playwright on backend
   - Better reliability and authentication handling
   - Can handle cookies/sessions

3. **Hybrid Approach**:
   - Try WebView extraction first
   - Fall back to server API if needed
   - Cache results to reduce requests

## Security Considerations

1. **User Privacy**: 
   - Only extract public data
   - Don't store authentication tokens
   - Respect platform ToS

2. **App Store Compliance**:
   - Clearly explain data usage
   - Get user consent
   - Follow platform guidelines

## Next Steps

1. **Test with Real URLs**: Try various post types
2. **Handle Edge Cases**: Private posts, deleted content
3. **Add Error Recovery**: Retry logic, fallbacks
4. **Implement Caching**: Store extracted data
5. **Add Authentication**: For private post access

## Alternative: Server-Side API

For production, consider creating a backend service:

```python
# backend/app/api/v1/extract.py
from fastapi import APIRouter, HTTPException
from playwright.async_api import async_playwright

router = APIRouter()

@router.post("/extract-post-data")
async def extract_post_data(url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Load page and extract data
        await page.goto(url)
        # ... extraction logic
        
        await browser.close()
        return extracted_data
```

This provides better reliability and can handle authentication.