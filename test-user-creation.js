#!/usr/bin/env node

// Test user creation and trend submission
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUserFlow() {
  console.log('🔄 Testing user creation and trend submission...\n');
  
  // Test user credentials
  const timestamp = Math.floor(Date.now() / 1000);
  const testEmail = `john.doe.${timestamp}@gmail.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `johndoe${timestamp}`;
  
  try {
    // Step 1: Create a test user
    console.log('📝 Step 1: Creating test user...');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Username: ${testUsername}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message);
      return;
    }
    
    console.log('✅ User created successfully!');
    console.log('  User ID:', signUpData.user?.id);
    
    // Step 2: Check if profile was created
    console.log('\n🔍 Step 2: Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', signUpData.user.id)
      .single();
    
    if (profileError) {
      console.log('⚠️  Profile not found:', profileError.message);
      console.log('  This is expected if trigger hasn\'t fired yet');
    } else {
      console.log('✅ Profile found:');
      console.log(`  Username: ${profile.username}`);
      console.log(`  Tier: ${profile.spotter_tier}`);
      console.log(`  Earnings: $${profile.total_earnings}`);
    }
    
    // Step 3: Test trend submission
    console.log('\n📸 Step 3: Submitting test trend...');
    const { data: trend, error: trendError } = await supabase
      .from('trend_submissions')
      .insert({
        spotter_id: signUpData.user.id,
        category: 'meme_format',
        description: 'Test trend submission - viral dance challenge',
        platform: 'TikTok',
        creator_handle: '@testcreator',
        creator_name: 'Test Creator',
        post_caption: 'New dance challenge #viral #fyp',
        views_count: 50000,
        likes_count: 5000,
        comments_count: 500,
        shares_count: 100,
        follower_count: 10000,
        hashtags: ['viral', 'fyp', 'dance'],
        post_url: 'https://tiktok.com/@test/video/123',
        posted_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (trendError) {
      console.error('❌ Trend submission failed:', trendError.message);
      console.log('  Error details:', trendError);
    } else {
      console.log('✅ Trend submitted successfully!');
      console.log(`  Trend ID: ${trend.id}`);
      console.log(`  Status: ${trend.status}`);
      console.log(`  Base amount: $${trend.base_amount}`);
      console.log(`  Total earned: $${trend.total_earned}`);
    }
    
    // Step 4: Test validation (need a second user)
    console.log('\n🗳️ Step 4: Testing validation...');
    console.log('  Creating second user for validation...');
    
    const validatorTimestamp = Math.floor(Date.now() / 1000);
    const validator = `jane.smith.${validatorTimestamp}@gmail.com`;
    const { data: validatorData, error: validatorError } = await supabase.auth.signUp({
      email: validator,
      password: testPassword,
      options: {
        data: {
          username: `janesmith${validatorTimestamp}`
        }
      }
    });
    
    if (validatorError) {
      console.log('⚠️  Could not create validator:', validatorError.message);
    } else if (trend) {
      console.log('  Validator created, attempting vote...');
      
      // Sign in as validator
      await supabase.auth.signOut();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validator,
        password: testPassword
      });
      
      if (!signInError) {
        // Cast vote
        const { data: voteResult, error: voteError } = await supabase
          .rpc('cast_trend_vote', {
            p_trend_id: trend.id,
            p_vote: 'verify'
          });
        
        if (voteError) {
          console.log('❌ Vote failed:', voteError.message);
        } else if (voteResult?.success) {
          console.log('✅ Vote cast successfully!');
        } else {
          console.log('⚠️  Vote response:', voteResult);
        }
      }
    }
    
    console.log('\n✨ Test complete!');
    console.log('\nSummary:');
    console.log(`  Test user: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);
    if (trend) {
      console.log(`  Trend ID: ${trend.id}`);
    }
    console.log('\nYou can now:');
    console.log('1. Log in at http://localhost:3001/login');
    console.log('2. Submit more trends at /submit');
    console.log('3. Validate trends at /validate');
    console.log('4. View earnings at /earnings');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testUserFlow();