#!/usr/bin/env node

// Verify Vercel deployment is using new Supabase
const https = require('https');

console.log('🔍 Verifying Vercel Deployment...\n');

// Replace with your actual Vercel URL
const VERCEL_URL = process.argv[2] || 'https://your-app.vercel.app';

console.log(`Checking: ${VERCEL_URL}\n`);

// Test 1: Check if the app loads
https.get(VERCEL_URL, (res) => {
  console.log(`✅ App Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // Check for Supabase references in the HTML
    if (data.includes('aicahushpcslwjwrlqbo')) {
      console.log('✅ Using NEW Supabase instance!');
    } else if (data.includes('achuavagkhjenaypawij')) {
      console.log('❌ Still using OLD Supabase instance!');
      console.log('\nTo fix:');
      console.log('1. Go to Vercel dashboard');
      console.log('2. Go to Settings → Environment Variables');
      console.log('3. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.log('4. Redeploy');
    } else {
      console.log('⚠️  Could not detect Supabase instance from HTML');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Clear your browser cache');
    console.log('2. Try logging in with NEW credentials:');
    console.log('   Email: tester.1754889443@wavesight.com');
    console.log('   Password: Test123!');
    console.log('\n3. If old accounts still work, the cache needs clearing');
    console.log('4. If you get numeric overflow errors, check Vercel env vars');
  });
}).on('error', (err) => {
  console.error('❌ Error checking deployment:', err.message);
});