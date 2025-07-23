# Screen Recording Setup Guide

## Current Implementation

The WAVESITE2 mobile app has a screen recording feature that:
1. Allows users to select TikTok or Instagram
2. Automatically opens the selected app via deep linking
3. Guides users to use the system screen recording feature
4. Captures post data during the recording session

## How It Works

### iOS
1. User taps "Start Recording" in the app
2. Selects TikTok or Instagram
3. App shows instructions to start iOS screen recording from Control Center
4. App automatically opens TikTok/Instagram via deep linking
5. User browses the social media app while recording
6. Returns to WAVESITE2 and taps "Stop Recording"

### Android
Similar flow using Android's built-in screen recorder from Quick Settings.

## Deep Linking Configuration

### iOS (Info.plist)
The app is configured to open:
- `tiktok://` - Opens TikTok app
- `instagram://` - Opens Instagram app
- Falls back to web URLs if apps aren't installed

### Android (AndroidManifest.xml)
Add to AndroidManifest.xml:
```xml
<queries>
  <package android:name="com.zhiliaoapp.musically" /> <!-- TikTok -->
  <package android:name="com.instagram.android" /> <!-- Instagram -->
</queries>
```

## Native Module Implementation (Future Enhancement)

To implement programmatic screen recording:

### iOS
1. Create `ScreenRecorder.swift` and `ScreenRecorder.m` bridge files
2. Use ReplayKit framework
3. Handle permissions and recording lifecycle

### Android
1. Create `ScreenRecorderModule.java`
2. Use MediaProjection API
3. Request screen capture permission
4. Handle foreground service for recording

## Testing the Current Implementation

1. Run the app: `npm run ios` or `npm run android`
2. Navigate to Recording tab
3. Tap "Start Recording"
4. Select TikTok or Instagram
5. Follow the instructions to start system screen recording
6. The app will automatically open the selected social media app
7. Browse content normally
8. Return to WAVESITE2 and stop the recording

## Limitations

Current implementation:
- Relies on system screen recording (not programmatic)
- Cannot automatically start/stop recording
- Post data extraction is simulated (would need OCR/ML in production)
- Video files need manual saving from system recording

## Next Steps

1. Implement native modules for programmatic recording
2. Add ML Kit for real-time text recognition
3. Implement automatic video upload to Supabase
4. Add post data extraction from video frames