#!/bin/bash

# Mobile App Fix Script
# Fixes common issues and prepares the app for development/production

echo "🔧 WaveSight Mobile App Fix Script"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 1. Check Node version
print_status "Checking Node.js version..."
NODE_VERSION=$(node -v)
print_success "Node version: $NODE_VERSION"

# 2. Clean and reinstall dependencies
print_status "Cleaning dependencies..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "Removed node_modules"
fi

if [ -f "package-lock.json" ]; then
    rm package-lock.json
    print_success "Removed package-lock.json"
fi

print_status "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# 3. Fix iOS specific issues
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_status "Fixing iOS configuration..."
    
    # Clean iOS build
    if [ -d "ios/build" ]; then
        rm -rf ios/build
        print_success "Cleaned iOS build folder"
    fi
    
    # Clean Pods
    cd ios
    if [ -d "Pods" ]; then
        print_status "Cleaning CocoaPods..."
        pod deintegrate
        rm -rf Pods
        rm Podfile.lock
        print_success "Cleaned CocoaPods"
    fi
    
    # Reinstall Pods
    print_status "Installing CocoaPods..."
    pod install
    if [ $? -eq 0 ]; then
        print_success "CocoaPods installed successfully"
    else
        print_warning "CocoaPods installation had issues - may need manual intervention"
    fi
    
    cd ..
fi

# 4. Fix Android specific issues
print_status "Fixing Android configuration..."

# Create local.properties if it doesn't exist
if [ ! -f "android/local.properties" ]; then
    print_status "Creating android/local.properties..."
    
    # Try to detect Android SDK location
    if [ -n "$ANDROID_HOME" ]; then
        echo "sdk.dir=$ANDROID_HOME" > android/local.properties
        print_success "Created local.properties with ANDROID_HOME: $ANDROID_HOME"
    elif [ -d "$HOME/Library/Android/sdk" ]; then
        echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
        print_success "Created local.properties with default Mac SDK path"
    elif [ -d "$HOME/Android/Sdk" ]; then
        echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
        print_success "Created local.properties with default Linux SDK path"
    else
        print_warning "Could not detect Android SDK location"
        print_warning "Please create android/local.properties manually with:"
        print_warning "sdk.dir=/path/to/your/Android/sdk"
    fi
fi

# Clean Android build
cd android
print_status "Cleaning Android build..."
./gradlew clean
if [ $? -eq 0 ]; then
    print_success "Android build cleaned"
else
    print_warning "Android clean had issues - may need manual intervention"
fi
cd ..

# 5. Fix Metro bundler cache
print_status "Clearing Metro bundler cache..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 5
kill $METRO_PID 2>/dev/null
print_success "Metro cache cleared"

# 6. Check and fix TypeScript issues
print_status "Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    npx tsc --noEmit
    if [ $? -eq 0 ]; then
        print_success "No TypeScript errors found"
    else
        print_warning "TypeScript compilation errors found - please review"
    fi
else
    print_error "tsconfig.json not found"
fi

# 7. Fix permissions for scripts
print_status "Setting script permissions..."
chmod +x scripts/*.sh 2>/dev/null
chmod +x android/gradlew 2>/dev/null
print_success "Script permissions updated"

# 8. Create .env file if needed
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    print_status "Creating .env.example file..."
    cat > .env.example << EOL
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration  
API_URL=https://your-api-url.com

# Environment
NODE_ENV=development
EOL
    print_success "Created .env.example - copy to .env and add your credentials"
fi

# 9. Final checks
echo ""
echo "=================================="
echo "📊 Fix Summary"
echo "=================================="

# Check if everything is ready
READY=true

if [ ! -d "node_modules" ]; then
    print_error "node_modules not found"
    READY=false
else
    print_success "Dependencies installed"
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ ! -d "ios/Pods" ]; then
        print_error "iOS Pods not installed"
        READY=false
    else
        print_success "iOS configured"
    fi
fi

if [ ! -f "android/local.properties" ]; then
    print_error "Android local.properties not configured"
    READY=false
else
    print_success "Android configured"
fi

echo ""
if [ "$READY" = true ]; then
    print_success "✅ Mobile app is ready!"
    echo ""
    echo "Next steps:"
    echo "1. For iOS: npm run ios"
    echo "2. For Android: npm run android"
    echo "3. To start Metro: npm start"
else
    print_warning "⚠️  Some issues remain - please review the errors above"
fi

echo ""
echo "=================================="