# WaveSight Mobile - Quick Start Guide

## ✅ Setup Complete!

The mobile app is now ready to capture TikTok and Instagram post data.

## 🚀 Next Steps

### 1. Set Up Database Tables

Since the Supabase CLI connection failed, you need to manually create the tables:

1. **Go to Supabase SQL Editor**: 
   https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql

2. **Run the SQL** from `setup-database-sql.md`

3. **Verify** tables were created in the Table Editor

### 2. Run the Mobile App

```bash
# iOS
cd mobile
npx pod-install ios  # Install iOS dependencies
npm run ios

# Android  
npm run android
```

### 3. Test the App

1. **Register/Login** with any email
2. **Start Recording**:
   - Tap the blue recording button
   - Select TikTok or Instagram
   - Grant screen recording permission
3. **Browse Content**:
   - App will open selected platform
   - Scroll through 3-5 posts slowly
   - Data is captured automatically
4. **Stop Recording**:
   - Return to WaveSight app
   - Tap stop button
   - View captured posts

## 📱 What Gets Captured

For each post viewed:
- **Creator**: @username
- **Caption**: Post text
- **Metrics**: Likes, comments, shares
- **Audio**: Song/sound name
- **Time**: How long you viewed it

## 🔧 Troubleshooting

### iOS Build Issues
```bash
cd ios
rm -rf Pods build
pod install
cd .. && npm run ios
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd .. && npm run android
```

### No Data Captured?
- Scroll slower (2-3 seconds per post)
- Ensure internet connection
- Check Supabase tables exist

## 🎯 Features

- **Screen Recording**: Native iOS/Android implementation
- **OCR Extraction**: ML Kit for text recognition  
- **Real-time Sync**: Instant Supabase upload
- **Wave Theme**: Consistent with web app
- **Privacy First**: Local processing, user-owned data

## 📊 View Your Data

1. **In App**: Real-time display while recording
2. **Supabase Dashboard**: Table Editor shows all data
3. **Web Dashboard**: http://134.199.179.19/dashboard

Ready to capture social media trends! 🌊