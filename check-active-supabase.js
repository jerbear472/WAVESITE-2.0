#!/usr/bin/env node

// Check which Supabase instance is active
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Supabase Configuration...\n');

// Check root .env
const rootEnv = path.join(__dirname, '.env');
if (fs.existsSync(rootEnv)) {
  const content = fs.readFileSync(rootEnv, 'utf8');
  const urlMatch = content.match(/SUPABASE_URL=([^\n]+)/);
  console.log('📁 Root .env:');
  if (urlMatch) {
    const url = urlMatch[1];
    if (url.includes('aicahushpcslwjwrlqbo')) {
      console.log('  ✅ NEW Supabase:', url);
    } else if (url.includes('aicahushpcslwjwrlqbo')) {
      console.log('  ❌ OLD Supabase:', url);
    } else {
      console.log('  ❓ Unknown:', url);
    }
  }
}

// Check web/.env.local
const webEnvLocal = path.join(__dirname, 'web', '.env.local');
if (fs.existsSync(webEnvLocal)) {
  const content = fs.readFileSync(webEnvLocal, 'utf8');
  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n]+)/);
  console.log('\n📁 web/.env.local:');
  if (urlMatch) {
    const url = urlMatch[1];
    if (url.includes('aicahushpcslwjwrlqbo')) {
      console.log('  ✅ NEW Supabase:', url);
    } else if (url.includes('aicahushpcslwjwrlqbo')) {
      console.log('  ❌ OLD Supabase:', url);
    } else {
      console.log('  ❓ Unknown:', url);
    }
  }
}

// Check web/.env.production
const webEnvProd = path.join(__dirname, 'web', '.env.production');
if (fs.existsSync(webEnvProd)) {
  const content = fs.readFileSync(webEnvProd, 'utf8');
  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n]+)/);
  console.log('\n📁 web/.env.production:');
  if (urlMatch) {
    const url = urlMatch[1];
    if (url.includes('aicahushpcslwjwrlqbo')) {
      console.log('  ✅ NEW Supabase:', url);
    } else if (url.includes('aicahushpcslwjwrlqbo')) {
      console.log('  ❌ OLD Supabase:', url);
    } else {
      console.log('  ❓ Unknown:', url);
    }
  }
}

console.log('\n📝 Summary:');
console.log('  OLD Supabase: aicahushpcslwjwrlqbo (has numeric overflow issues)');
console.log('  NEW Supabase: aicahushpcslwjwrlqbo (fresh, clean instance)');
console.log('\nIf you see OLD anywhere above, that file needs updating!');

// Test actual connection
console.log('\n🔄 Testing actual connection...');
require('dotenv').config({ path: webEnvLocal });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url) {
  if (url.includes('aicahushpcslwjwrlqbo')) {
    console.log('✅ App SHOULD be using NEW Supabase');
  } else if (url.includes('aicahushpcslwjwrlqbo')) {
    console.log('❌ App IS STILL using OLD Supabase!');
    console.log('  This explains the numeric overflow errors!');
  }
}

// Check if there's a .env file in web directory that might override
const webEnv = path.join(__dirname, 'web', '.env');
if (fs.existsSync(webEnv)) {
  console.log('\n⚠️  WARNING: Found web/.env file which might override .env.local!');
  const content = fs.readFileSync(webEnv, 'utf8');
  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n]+)/);
  if (urlMatch) {
    console.log('  Content:', urlMatch[1]);
  }
}