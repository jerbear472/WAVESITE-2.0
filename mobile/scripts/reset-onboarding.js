#!/usr/bin/env node

/**
 * Reset Onboarding Script
 * Clears all onboarding-related data for testing
 */

const { MMKV } = require('react-native-mmkv');

const storage = new MMKV({
  id: 'wavesight-storage',
});

console.log('🔄 Resetting onboarding data...\n');

const keysToReset = [
  'onboarding_completed',
  'onboarding_date',
  'permissions_granted',
  'permissions_skipped',
  'permissions_date',
  'personalization_completed',
  'user_username',
  'user_interests',
  'user_platforms',
];

keysToReset.forEach(key => {
  try {
    storage.delete(key);
    console.log(`  ✅ Cleared: ${key}`);
  } catch (error) {
    console.log(`  ❌ Failed to clear: ${key}`);
  }
});

console.log('\n✨ Onboarding reset complete!');
console.log('Restart the app to see the onboarding flow again.');