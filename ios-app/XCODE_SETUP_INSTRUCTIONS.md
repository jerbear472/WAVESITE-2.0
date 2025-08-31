# WaveSight iOS App - Xcode Setup Instructions

## Step 1: Create New Project in Xcode

1. In Xcode (which should be open), go to **File → New → Project** (or press Cmd+Shift+N)
2. Select **iOS** → **App** template
3. Click **Next**

## Step 2: Configure Project Settings

Fill in the following details:
- **Product Name**: WaveSight
- **Team**: (Select your team or None)
- **Organization Identifier**: com.wavesight
- **Bundle Identifier**: (auto-filled as com.wavesight.WaveSight)
- **Interface**: SwiftUI
- **Language**: Swift
- **Use Core Data**: Unchecked
- **Include Tests**: Unchecked (for now)

Click **Next**

## Step 3: Save Project Location

- Navigate to: `/Users/JeremyUys_1/Desktop/FreeWaveSight/ios-app`
- **IMPORTANT**: Make sure "Create Git repository on my Mac" is UNCHECKED
- Click **Create**

## Step 4: Add Existing Files to Project

1. In Xcode, delete the default `ContentView.swift` file (Move to Trash)
2. Right-click on the WaveSight folder in the project navigator
3. Select **Add Files to "WaveSight"...**
4. Navigate to `/Users/JeremyUys_1/Desktop/FreeWaveSight/ios-app`
5. Select the following folders and files:
   - `WaveSightApp.swift`
   - `Managers` folder
   - `Models` folder
   - `Views` folder
6. Make sure:
   - "Copy items if needed" is UNCHECKED (files are already in place)
   - "Create groups" is selected
   - "WaveSight" target is checked
7. Click **Add**

## Step 5: Add Package Dependencies

1. Select the WaveSight project in the navigator
2. Click on the WaveSight project (not target)
3. Go to **Package Dependencies** tab
4. Click the **+** button
5. Add these packages:

### Supabase Swift
- URL: `https://github.com/supabase-community/supabase-swift.git`
- Version: Up to Next Major Version: 2.0.0

### SwiftUIX (Optional, for enhanced UI)
- URL: `https://github.com/SwiftUIX/SwiftUIX.git`
- Version: Up to Next Major Version: 0.2.0

### Nuke (for image loading)
- URL: `https://github.com/kean/Nuke.git`
- Version: Up to Next Major Version: 12.0.0

## Step 6: Configure Build Settings

1. Select the WaveSight target
2. Go to **Build Settings**
3. Search for "App Sandbox"
4. Set **App Sandbox** to NO (for development)
5. Go to **Signing & Capabilities**
6. Ensure "Automatically manage signing" is checked
7. Select your Development Team

## Step 7: Add App Icons and Assets

1. Select `Assets.xcassets` in the project navigator
2. The AppIcon set is already created
3. You can add app icon images later

## Step 8: Build and Run

1. Select an iPhone simulator (e.g., iPhone 15 Pro) from the device menu
2. Press **Cmd+B** to build
3. Press **Cmd+R** to run

## Alternative: Command Line Build

Once the project is created, you can also build from terminal:
```bash
cd /Users/JeremyUys_1/Desktop/FreeWaveSight/ios-app
./build-project.sh
```

## Troubleshooting

If you encounter build errors:

1. **Missing NavigationManager**: Add this file to Models:
```swift
import SwiftUI

class NavigationManager: ObservableObject {
    @Published var selectedTab = 0
}
```

2. **Supabase Configuration**: Update `AuthManager.swift` with your Supabase credentials

3. **Clean Build**: Product → Clean Build Folder (Cmd+Shift+K)

## Next Steps

After successful build:
1. Test all navigation tabs
2. Verify Profile icon appears in navigation bars
3. Test the authentication flow
4. Add your Supabase credentials to connect to backend