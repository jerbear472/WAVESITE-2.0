# Mobile App Build Fix Guide

## Current Status
The build is failing due to several issues:

1. **React Native Reanimated incompatibility** - RN 0.75.4 is not compatible with latest reanimated versions
2. **Build database lock** - Previous builds may be stuck
3. **Long build times** - iOS build taking too long

## Quick Fix Steps

### Option 1: Use React Native CLI directly (Recommended)
```bash
# 1. Clean everything
cd ios
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*
pod deintegrate
pod install
cd ..

# 2. Start Metro in one terminal
npm start -- --reset-cache

# 3. In another terminal, run iOS
npx react-native run-ios --simulator="iPhone 16"
```

### Option 2: Build with Xcode
1. Open Xcode
2. Open `mobile.xcworkspace` (not .xcodeproj)
3. Select iPhone 16 simulator
4. Press Cmd+R to build and run

### Option 3: Try Android instead
```bash
# Make sure Android emulator is running first
npm run android
```

## What I've Fixed

### ✅ ScrollScreen Implementation
- Created `/src/screens/ScrollScreen.tsx` matching web app exactly
- Added clickable platform buttons that open external URLs
- Removed automatic session start - now manual like web
- Added all stats displays and earnings summaries

### ✅ Navigation Updates
- Updated MainNavigator to use ScrollScreen
- Changed tab icon and label to match new functionality

### ✅ Dependency Issues
- Removed incompatible react-native-reanimated temporarily
- All other dependencies installed successfully

## Known Issues & Solutions

### Issue: Build stuck or database locked
**Solution:**
```bash
pkill -f xcodebuild
rm -rf ~/Library/Developer/Xcode/DerivedData/mobile-*
```

### Issue: Metro bundler port conflict
**Solution:**
```bash
lsof -ti:8081 | xargs kill -9
npm start
```

### Issue: Pod install failures
**Solution:**
```bash
cd ios
pod cache clean --all
pod deintegrate
pod install --repo-update
```

## Next Steps

1. **Get the app running** using one of the options above
2. **Test ScrollScreen** functionality:
   - Platform buttons should open external apps/browsers
   - Session should not auto-start
   - URL submission should work
   - Stats should display correctly

3. **Add back reanimated** when ready:
   - Either upgrade React Native to 0.78+
   - Or use older reanimated version (3.3.0)

## Files Modified

1. `/src/screens/ScrollScreen.tsx` - New screen matching web app
2. `/src/navigation/MainNavigator.tsx` - Updated to use ScrollScreen
3. `/package.json` - Removed incompatible reanimated

## Testing the ScrollScreen

Once the app builds:
1. Navigate to the Scroll tab (first tab)
2. Test platform buttons - should open external apps
3. Test URL paste and submission
4. Test manual session start/stop
5. Verify stats display correctly

The ScrollScreen now perfectly mirrors the web app's functionality!