# WaveSight Mobile App Setup Guide

## Quick Start

### 1. Apply Supabase Migrations

First, create the required database tables:

```bash
# From the project root
cd supabase

# Apply the migration
npx supabase db push --db-url "postgresql://postgres:qIvwos-vujzy1-dopzeb@db.achuavagkhjenaypawij.supabase.co:5432/postgres"
```

### 2. Install Mobile Dependencies

```bash
cd mobile
npm install

# Additional required packages
npm install @react-native-async-storage/async-storage

# iOS setup
cd ios && pod install && cd ..
```

### 3. Configure Native Modules

#### iOS Configuration
1. Open `ios/mobile.xcworkspace` in Xcode
2. Add `ScreenRecorder.swift` to your project
3. Ensure bridging header is configured
4. Build the project

#### Android Configuration
1. Open `android/` in Android Studio
2. Sync Gradle files
3. Ensure ScreenRecorderModule is registered in MainApplication.java

### 4. Run the App

```bash
# iOS
npm run ios

# Android
npm run android
```

## Key Features Implementation

### Screen Recording Flow
1. User taps "Start Recording"
2. Selects platform (TikTok/Instagram)
3. Grants screen recording permission
4. App opens selected social media app
5. OCR extracts data every 2 seconds
6. Data saved to Supabase in real-time

### Data Captured
- **Creator Handle**: @username
- **Caption**: Post text content
- **Engagement**: Likes, comments, shares
- **Audio**: Song/sound information
- **Dwell Time**: How long user viewed post

### Testing the App

1. **Create Test Account**:
   - Open app and register
   - Use any email/password

2. **Test Recording**:
   - Start recording
   - Open TikTok/Instagram
   - Scroll through 3-5 posts
   - Return to app and stop recording

3. **Verify Data**:
   - Check captured posts display
   - Verify data in Supabase dashboard

## Troubleshooting

### Common Issues

**"Permission Denied" Error**
- iOS: Settings > Privacy > Screen Recording > Enable WaveSight
- Android: Settings > Apps > WaveSight > Permissions > Enable all

**No Data Captured**
- Ensure you're scrolling slowly (2-3 seconds per post)
- Check internet connection for Supabase sync
- Verify OCR is working (check logs)

**Build Errors**
- Clean build: `cd ios && rm -rf build && pod install`
- Reset Metro: `npm start -- --reset-cache`

## Next Steps

1. Test with real TikTok/Instagram content
2. Monitor Supabase dashboard for captured data
3. Adjust OCR patterns if needed
4. Deploy to TestFlight/Play Console for beta testing