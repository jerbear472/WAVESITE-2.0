#!/bin/bash

echo "🔧 Fixing react-native-reanimated imports..."

# Find all files with reanimated imports
FILES=$(grep -r "from 'react-native-reanimated'" src --include="*.tsx" --include="*.ts" -l)

for file in $FILES; do
    echo "Processing: $file"
    
    # Create a temporary file
    temp_file="${file}.tmp"
    
    # Replace reanimated imports with standard React Native Animated
    sed "s/from 'react-native-reanimated'/from 'react-native'/g" "$file" > "$temp_file"
    
    # Replace specific Reanimated 2 imports
    sed -i '' 's/import Animated, {[^}]*} from .react-native.;/import { Animated } from "react-native";/g' "$temp_file"
    
    # Replace useSharedValue with useRef + Animated.Value
    sed -i '' 's/useSharedValue(/new Animated.Value(/g' "$temp_file"
    sed -i '' 's/\.value//g' "$temp_file"
    
    # Replace withTiming
    sed -i '' 's/withTiming(/Animated.timing(/g' "$temp_file"
    sed -i '' 's/withSpring(/Animated.spring(/g' "$temp_file"
    
    # Move the temp file back
    mv "$temp_file" "$file"
done

echo "✅ Fixed all react-native-reanimated imports"
echo "⚠️  Note: Complex animations may need manual adjustments"