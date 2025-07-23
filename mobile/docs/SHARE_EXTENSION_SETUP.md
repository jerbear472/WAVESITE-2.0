# ShareExtension Setup Guide for WaveSight

This guide will help you add the ShareExtension target to your Xcode project so users can share content from TikTok, Instagram, and YouTube directly to WaveSight.

## Prerequisites

- Xcode 14.0 or later
- iOS project already set up
- Apple Developer account (for App Groups)

## Step 1: Add ShareExtension Target

1. Open your project in Xcode: `mobile/ios/mobile.xcworkspace`
2. Select your project in the navigator
3. Click the "+" button at the bottom of the targets list
4. Choose "Share Extension" from the iOS templates
5. Name it "ShareExtension"
6. Set the bundle identifier to: `com.yourcompany.mobile.ShareExtension`
7. Choose Swift as the language
8. Click "Finish"

## Step 2: Configure App Groups

App Groups allow your main app and extension to share data.

### Enable App Groups for Main App:
1. Select your main app target
2. Go to "Signing & Capabilities" tab
3. Click "+ Capability"
4. Add "App Groups"
5. Click "+" under App Groups
6. Name it: `group.com.yourcompany.mobile`

### Enable App Groups for ShareExtension:
1. Select the ShareExtension target
2. Go to "Signing & Capabilities" tab
3. Click "+ Capability"
4. Add "App Groups"
5. Select the same group: `group.com.yourcompany.mobile`

## Step 3: Replace ShareExtension Code

Replace the contents of `ShareViewController.swift` with the code already created at:
`mobile/ios/ShareExtension/ShareViewController.swift`

## Step 4: Configure Info.plist

1. Open `ShareExtension/Info.plist`
2. Expand `NSExtension` > `NSExtensionAttributes`
3. Configure the activation rules:

```xml
<key>NSExtensionActivationRule</key>
<dict>
    <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
    <integer>1</integer>
    <key>NSExtensionActivationSupportsText</key>
    <false/>
    <key>NSExtensionActivationSupportsImageWithMaxCount</key>
    <integer>0</integer>
</dict>
```

## Step 5: Update Bundle Display Name

In `ShareExtension/Info.plist`, add:

```xml
<key>CFBundleDisplayName</key>
<string>WaveSight</string>
```

## Step 6: Add Extension to Build Schemes

1. Select your scheme in Xcode
2. Edit scheme
3. Under "Build", make sure ShareExtension is included
4. Check "Parallelize Build" is enabled

## Step 7: Configure Deployment Target

1. Select ShareExtension target
2. Go to "General" tab
3. Set Deployment Target to match your main app (iOS 13.0 or later)

## Step 8: Build and Test

1. Build the project: `Cmd + B`
2. Run on device or simulator
3. Open Safari/TikTok/Instagram
4. Try sharing a link
5. You should see "WaveSight" in the share sheet

## Troubleshooting

### ShareExtension doesn't appear:
- Clean build folder: `Cmd + Shift + K`
- Delete app from device/simulator
- Rebuild and reinstall
- Check console logs for errors

### "App Groups not configured" error:
- Ensure both targets use the same App Group ID
- Check provisioning profiles include App Groups capability

### Build errors:
- Ensure ShareExtension deployment target matches main app
- Check Swift version compatibility
- Verify bundle identifiers are correct

## Testing the Integration

1. Install the app on your device
2. Open TikTok/Instagram/YouTube
3. Find a video you want to share
4. Tap the share button
5. Select "WaveSight" from the share sheet
6. The app should open with the shared URL ready to capture

## Next Steps

After setting up the ShareExtension:
1. Test sharing from all supported platforms
2. Verify metadata extraction works correctly
3. Ensure trends are saved to the database
4. Test the user flow from share to saved trend

## Notes

- The ShareExtension runs in a separate process with limited memory
- Keep the extension lightweight
- Use App Groups or URL schemes to pass data to the main app
- Test on real devices for best results