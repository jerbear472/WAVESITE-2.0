# WAVESITE Data Extraction Flow

## How Screen Recording Data Gets Processed

### 1. Recording Phase
- User starts iOS screen recording manually from Control Center
- App automatically opens TikTok/Instagram
- User browses content while iOS records everything
- Video is saved to Photos app

### 2. Upload Phase
- User opens WAVESITE and goes to Recording screen
- Taps "Select Video from Photos" 
- Video is uploaded to Supabase Storage
- A processing job is created in the database

### 3. Processing Phase (Backend)
The WAVESITE backend processes videos using:

#### Computer Vision & OCR
- **Frame Extraction**: Video is split into frames (2-5 fps)
- **Post Detection**: AI detects when a new post appears on screen
- **Text Recognition**: OCR extracts:
  - Username/Creator handle
  - Caption text
  - Comments
  - Like/Share/Comment counts
  - Hashtags
  - Song/Audio information

#### Machine Learning Pipeline
```python
# Simplified processing flow
def process_video(video_url):
    frames = extract_frames(video_url)
    posts = []
    
    for frame in frames:
        # Detect if this is a TikTok/Instagram post
        if is_social_media_post(frame):
            # Extract all visible text
            text_data = ocr_extract(frame)
            
            # Parse metrics
            post_data = {
                'creator': extract_username(text_data),
                'caption': extract_caption(text_data),
                'likes': extract_number(text_data, 'likes'),
                'comments': extract_number(text_data, 'comments'),
                'shares': extract_number(text_data, 'shares'),
                'hashtags': extract_hashtags(text_data),
                'dwell_time': calculate_dwell_time(frame_sequence)
            }
            
            posts.append(post_data)
    
    return posts
```

### 4. Data Storage
Extracted data is stored in the `captured_posts` table:
- Post metadata (creator, caption, metrics)
- Engagement metrics (likes, comments, shares)
- Content attributes (hashtags, audio)
- User behavior (dwell time)

### 5. Analytics & Insights
The web dashboard analyzes this data to:
- Identify trending content patterns
- Track viral growth trajectories
- Predict future trends
- Generate content recommendations

## Current Implementation Status

### ✅ Working
- Screen recording flow
- Video saves to Photos
- App opens TikTok/Instagram
- Basic upload UI

### 🚧 Backend Required
- Video processing pipeline
- OCR/Computer vision
- ML models for post detection
- Real-time analytics

## Alternative: Real-time Processing
In the enhanced version, the app could:
1. Use iOS Vision framework for on-device OCR
2. Process frames in real-time during recording
3. Extract data without uploading video
4. Provide instant analytics

But this requires native module development.

## Manual Testing
To test the current flow:
1. Record a TikTok/Instagram session
2. Upload the video via the app
3. Check Supabase Storage for the uploaded file
4. Backend would process this file (when implemented)