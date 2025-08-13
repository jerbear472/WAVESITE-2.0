#!/usr/bin/env node

/**
 * Mobile App Health Check Script
 * Identifies and reports common issues in the React Native app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const issues = [];
const warnings = [];
const successes = [];

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    successes.push(`✓ ${description}`);
    return true;
  } else {
    issues.push(`✗ Missing: ${description} (${filePath})`);
    return false;
  }
}

function runCommand(command, description) {
  try {
    execSync(command, { stdio: 'ignore' });
    successes.push(`✓ ${description}`);
    return true;
  } catch (error) {
    issues.push(`✗ Failed: ${description}`);
    return false;
  }
}

// 1. Check package.json and node_modules
log('\n📦 Checking Dependencies...', 'blue');
if (checkFileExists('package.json', 'package.json exists')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check React Native version
  const rnVersion = packageJson.dependencies['react-native'];
  if (rnVersion) {
    successes.push(`✓ React Native version: ${rnVersion}`);
  } else {
    issues.push('✗ React Native not found in dependencies');
  }
  
  // Check for node_modules
  checkFileExists('node_modules', 'node_modules installed');
}

// 2. Check iOS Configuration
log('\n🍎 Checking iOS Configuration...', 'blue');
checkFileExists('ios/Podfile', 'iOS Podfile exists');
checkFileExists('ios/Podfile.lock', 'iOS Pods installed');
checkFileExists('ios/mobile.xcworkspace', 'iOS workspace exists');

// Check if Pods are up to date
if (fs.existsSync('ios/Podfile.lock') && fs.existsSync('ios/Podfile')) {
  const podfileLockTime = fs.statSync('ios/Podfile.lock').mtime;
  const podfileTime = fs.statSync('ios/Podfile').mtime;
  
  if (podfileTime > podfileLockTime) {
    warnings.push('⚠️  Podfile has been modified after last pod install');
  }
}

// 3. Check Android Configuration
log('\n🤖 Checking Android Configuration...', 'blue');
checkFileExists('android/gradlew', 'Android Gradle wrapper exists');
checkFileExists('android/app/build.gradle', 'Android app build.gradle exists');
checkFileExists('android/local.properties', 'Android local.properties exists');

// 4. Check Supabase Configuration
log('\n🔌 Checking API Configuration...', 'blue');
const supabaseConfigPath = 'src/config/supabase.ts';
if (checkFileExists(supabaseConfigPath, 'Supabase config exists')) {
  const config = fs.readFileSync(supabaseConfigPath, 'utf8');
  
  if (config.includes('supabaseUrl') && config.includes('supabaseAnonKey')) {
    successes.push('✓ Supabase credentials configured');
    
    // Check if URL is valid
    const urlMatch = config.match(/supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
    if (urlMatch && urlMatch[1].startsWith('https://')) {
      successes.push(`✓ Supabase URL: ${urlMatch[1].split('.')[0]}...`);
    } else {
      issues.push('✗ Invalid Supabase URL');
    }
  } else {
    issues.push('✗ Supabase credentials not properly configured');
  }
}

// 5. Check Required Files
log('\n📁 Checking Required Files...', 'blue');
const requiredFiles = [
  'App.tsx',
  'index.js',
  'babel.config.js',
  'metro.config.js',
  'tsconfig.json'
];

requiredFiles.forEach(file => {
  checkFileExists(file, `${file} exists`);
});

// 6. Check for common issues in code
log('\n🔍 Checking for Common Issues...', 'blue');

// Check App.tsx for proper imports
if (fs.existsSync('App.tsx')) {
  const appContent = fs.readFileSync('App.tsx', 'utf8');
  
  if (appContent.includes('react-native-gesture-handler')) {
    successes.push('✓ Gesture handler imported');
  } else {
    warnings.push('⚠️  Gesture handler not imported in App.tsx');
  }
  
  if (appContent.includes('ErrorBoundary')) {
    successes.push('✓ Error boundary configured');
  }
}

// 7. Check TypeScript configuration
if (fs.existsSync('tsconfig.json')) {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (tsConfig.compilerOptions) {
    successes.push('✓ TypeScript configured');
  }
}

// 8. Check for environment-specific files
log('\n🔐 Checking Environment Configuration...', 'blue');
if (fs.existsSync('.env') || fs.existsSync('.env.local')) {
  warnings.push('⚠️  Environment file found - ensure it\'s not committed to git');
}

// 9. Check navigation setup
log('\n🧭 Checking Navigation...', 'blue');
const navFiles = [
  'src/navigation/RootNavigatorEnhanced.tsx',
  'src/navigation/AuthNavigator.tsx',
  'src/navigation/MainNavigator.tsx'
];

navFiles.forEach(file => {
  if (fs.existsSync(file)) {
    successes.push(`✓ ${path.basename(file)} exists`);
  }
});

// 10. Generate fixes for common issues
const fixes = [];

if (!fs.existsSync('node_modules')) {
  fixes.push('npm install');
}

if (fs.existsSync('ios') && !fs.existsSync('ios/Pods')) {
  fixes.push('cd ios && pod install');
}

if (!fs.existsSync('android/local.properties')) {
  fixes.push('Create android/local.properties with sdk.dir pointing to your Android SDK');
}

// Print results
log('\n' + '='.repeat(60), 'blue');
log('📊 MOBILE APP HEALTH CHECK RESULTS', 'blue');
log('='.repeat(60), 'blue');

if (successes.length > 0) {
  log(`\n✅ PASSED (${successes.length})`, 'green');
  successes.forEach(s => log(s, 'green'));
}

if (warnings.length > 0) {
  log(`\n⚠️  WARNINGS (${warnings.length})`, 'yellow');
  warnings.forEach(w => log(w, 'yellow'));
}

if (issues.length > 0) {
  log(`\n❌ ISSUES (${issues.length})`, 'red');
  issues.forEach(i => log(i, 'red'));
}

if (fixes.length > 0) {
  log('\n🔧 SUGGESTED FIXES:', 'blue');
  fixes.forEach((fix, index) => {
    log(`${index + 1}. ${fix}`, 'yellow');
  });
}

// Summary
log('\n' + '='.repeat(60), 'blue');
const totalChecks = successes.length + warnings.length + issues.length;
const healthScore = Math.round((successes.length / totalChecks) * 100);

if (healthScore >= 90) {
  log(`🎉 Health Score: ${healthScore}% - Excellent!`, 'green');
} else if (healthScore >= 70) {
  log(`👍 Health Score: ${healthScore}% - Good`, 'green');
} else if (healthScore >= 50) {
  log(`⚠️  Health Score: ${healthScore}% - Needs Attention`, 'yellow');
} else {
  log(`❌ Health Score: ${healthScore}% - Critical Issues`, 'red');
}

log('='.repeat(60) + '\n', 'blue');

// Exit with appropriate code
process.exit(issues.length > 0 ? 1 : 0);