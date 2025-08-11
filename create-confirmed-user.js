#!/usr/bin/env node

// Create a new test user and bypass email confirmation using service role
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

// Use service role to bypass RLS and email confirmation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Also create regular client for testing
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function createConfirmedUser() {
  console.log('🔄 Creating confirmed test users...\n');
  
  const timestamp = Math.floor(Date.now() / 1000);
  const testUser = {
    email: `tester.${timestamp}@wavesight.com`,
    password: 'Test123!',
    username: `tester${timestamp}`
  };
  
  const validatorUser = {
    email: `validator.${timestamp}@wavesight.com`,
    password: 'Test123!',
    username: `validator${timestamp}`
  };
  
  try {
    // Create first user with admin client (bypasses email confirmation)
    console.log('👤 Creating main test user...');
    const { data: user1, error: error1 } = await supabaseAdmin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: testUser.username
      }
    });
    
    if (error1) {
      console.error('❌ Failed to create test user:', error1.message);
      return;
    }
    
    console.log('✅ Test user created:');
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Password: ${testUser.password}`);
    console.log(`  User ID: ${user1.user.id}`);
    
    // Create validator user
    console.log('\n👤 Creating validator user...');
    const { data: user2, error: error2 } = await supabaseAdmin.auth.admin.createUser({
      email: validatorUser.email,
      password: validatorUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: validatorUser.username
      }
    });
    
    if (error2) {
      console.error('❌ Failed to create validator:', error2.message);
    } else {
      console.log('✅ Validator created:');
      console.log(`  Email: ${validatorUser.email}`);
      console.log(`  Password: ${validatorUser.password}`);
      console.log(`  User ID: ${user2.user.id}`);
    }
    
    // Test sign in with the new user
    console.log('\n🔐 Testing sign in...');
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
    } else {
      console.log('✅ Sign in successful!');
      
      // Test trend submission
      console.log('\n📸 Testing trend submission...');
      const { data: trend, error: trendError } = await supabaseClient
        .from('trend_submissions')
        .insert({
          category: 'visual_style',
          description: 'Y2K fashion revival with low-rise jeans and butterfly clips',
          platform: 'TikTok',
          creator_handle: '@y2kfashion',
          creator_name: 'Y2K Fashion Revival',
          post_caption: 'The 2000s are back! #y2k #fashion #nostalgia',
          views_count: 125000,
          likes_count: 15000,
          comments_count: 850,
          shares_count: 420,
          follower_count: 50000,
          hashtags: ['y2k', 'fashion', 'nostalgia', 'throwback'],
          post_url: 'https://tiktok.com/@y2kfashion/video/test',
          posted_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (trendError) {
        console.error('❌ Trend submission failed:', trendError.message);
        console.log('  Make sure FINAL_RLS_FIX.sql has been run');
      } else {
        console.log('✅ Trend submitted successfully!');
        console.log(`  Trend ID: ${trend.id}`);
        console.log(`  Status: ${trend.status}`);
        console.log(`  Earnings: $${trend.base_amount || '1.00'}`);
        
        // Test validation with second user
        console.log('\n🗳️ Testing validation...');
        await supabaseClient.auth.signOut();
        
        const { error: signIn2Error } = await supabaseClient.auth.signInWithPassword({
          email: validatorUser.email,
          password: validatorUser.password
        });
        
        if (!signIn2Error) {
          const { data: voteResult, error: voteError } = await supabaseClient
            .rpc('cast_trend_vote', {
              p_trend_id: trend.id,
              p_vote: 'verify'
            });
          
          if (voteError) {
            console.log('❌ Vote failed:', voteError.message);
          } else if (voteResult?.success) {
            console.log('✅ Validation vote cast successfully!');
          } else {
            console.log('⚠️  Vote response:', voteResult);
          }
        }
      }
    }
    
    console.log('\n✨ Setup Complete!\n');
    console.log('================================\n');
    console.log('Test Credentials:');
    console.log(`📧 Main User: ${testUser.email}`);
    console.log(`🔑 Password: ${testUser.password}`);
    console.log(`📧 Validator: ${validatorUser.email}`);
    console.log(`🔑 Password: ${validatorUser.password}`);
    console.log('\nYou can now:');
    console.log('1. Login at http://localhost:3001/login');
    console.log('2. Submit trends at http://localhost:3001/submit');
    console.log('3. Validate trends at http://localhost:3001/validate');
    console.log('4. View earnings at http://localhost:3001/earnings');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createConfirmedUser();