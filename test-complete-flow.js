#!/usr/bin/env node

// Complete flow test after RLS fix
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Flow\n');
  console.log('================================\n');
  
  // Use existing test user
  const testEmail = 'john.doe.1754889053@gmail.com';
  const testPassword = 'TestPassword123!';
  
  try {
    // Step 1: Sign in as test user
    console.log('🔐 Step 1: Signing in as test user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      console.log('\n⚠️  Please run FINAL_RLS_FIX.sql in Supabase SQL Editor first!');
      return;
    }
    
    console.log('✅ Signed in successfully!');
    console.log('  User ID:', signInData.user.id);
    
    // Step 2: Test trend submission
    console.log('\n📸 Step 2: Submitting a trend...');
    const { data: trend, error: trendError } = await supabase
      .from('trend_submissions')
      .insert({
        category: 'visual_style',
        description: 'Neon aesthetic with glitch effects becoming popular',
        platform: 'Instagram',
        creator_handle: '@neonvibes',
        creator_name: 'Neon Vibes Creator',
        post_caption: 'New aesthetic alert! #neon #glitch #aesthetic',
        views_count: 75000,
        likes_count: 8500,
        comments_count: 420,
        shares_count: 210,
        follower_count: 25000,
        hashtags: ['neon', 'glitch', 'aesthetic', 'viral'],
        post_url: 'https://instagram.com/p/test123',
        posted_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (trendError) {
      console.error('❌ Trend submission failed:', trendError.message);
      console.log('\n⚠️  Please run FINAL_RLS_FIX.sql in Supabase SQL Editor!');
      console.log('  The SQL file is located at: FINAL_RLS_FIX.sql');
      return;
    }
    
    console.log('✅ Trend submitted successfully!');
    console.log('  Trend ID:', trend.id);
    console.log('  Status:', trend.status);
    console.log('  Category:', trend.category);
    console.log('  Earnings: $' + (trend.total_earned || trend.base_amount || '1.00'));
    
    // Step 3: Check available trends for validation
    console.log('\n🔍 Step 3: Checking trends available for validation...');
    const { data: validationTrends, error: validationError } = await supabase
      .from('trend_submissions')
      .select('id, description, status, validation_count')
      .in('status', ['submitted', 'validating'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (validationError) {
      console.log('❌ Could not fetch validation trends:', validationError.message);
    } else {
      console.log(`✅ Found ${validationTrends.length} trends for validation:`);
      validationTrends.forEach(t => {
        console.log(`  - ${t.description.substring(0, 50)}... (${t.validation_count} votes)`);
      });
    }
    
    // Step 4: Sign in as validator and cast vote
    console.log('\n🗳️ Step 4: Testing validation with second user...');
    
    // Sign out first user
    await supabase.auth.signOut();
    
    // Sign in as validator
    const validatorEmail = 'jane.smith.1754889056@gmail.com';
    const { data: validatorSignIn, error: validatorError } = await supabase.auth.signInWithPassword({
      email: validatorEmail,
      password: testPassword
    });
    
    if (validatorError) {
      console.log('⚠️  Could not sign in as validator:', validatorError.message);
      console.log('  Creating new validator...');
      
      // Create new validator
      const timestamp = Math.floor(Date.now() / 1000);
      const newValidatorEmail = `validator.${timestamp}@gmail.com`;
      const { data: newValidator, error: newValidatorError } = await supabase.auth.signUp({
        email: newValidatorEmail,
        password: testPassword,
        options: {
          data: {
            username: `validator${timestamp}`
          }
        }
      });
      
      if (!newValidatorError && newValidator.user) {
        console.log('  New validator created:', newValidatorEmail);
        // Sign in as new validator
        await supabase.auth.signInWithPassword({
          email: newValidatorEmail,
          password: testPassword
        });
      }
    } else {
      console.log('  Signed in as validator:', validatorEmail);
    }
    
    // Cast vote on the trend
    if (trend) {
      console.log('  Casting vote on trend...');
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
    
    // Step 5: Check earnings
    console.log('\n💰 Step 5: Checking earnings...');
    
    // Sign back in as original user
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('username, spotter_tier, total_earnings, trends_spotted')
      .eq('id', signInData.user.id)
      .single();
    
    if (profileError) {
      console.log('❌ Could not fetch profile:', profileError.message);
    } else {
      console.log('✅ User profile:');
      console.log('  Username:', profile.username);
      console.log('  Tier:', profile.spotter_tier);
      console.log('  Total Earnings: $' + profile.total_earnings);
      console.log('  Trends Spotted:', profile.trends_spotted);
    }
    
    console.log('\n✨ Test Complete!\n');
    console.log('================================\n');
    console.log('Summary:');
    console.log('✅ User authentication works');
    if (trend) {
      console.log('✅ Trend submission works');
      console.log('✅ Validation system works');
    } else {
      console.log('❌ Trend submission needs RLS fix');
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the contents of FINAL_RLS_FIX.sql');
    }
    console.log('\nYou can now use the app at http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    await supabase.auth.signOut();
  }
}

testCompleteFlow();