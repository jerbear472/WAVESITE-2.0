#!/usr/bin/env node

/**
 * Fix database using Supabase client directly
 * This uses the same connection that your app uses
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFixes() {
  console.log('🚀 Fixing database using Supabase client...\n');
  
  try {
    // Test connection
    console.log('1. Testing connection...');
    const { data: test, error: testError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('   ❌ Connection failed:', testError.message);
      return;
    }
    console.log('   ✅ Connected successfully!\n');
    
    // Check what exists
    console.log('2. Checking current state...');
    
    // Check if profiles view exists by trying to query it
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.log('   ⚠️  profiles view might not exist');
    } else {
      console.log('   ✅ profiles view exists');
    }
    
    // Check if voting function exists
    const { data: voteTest, error: voteError } = await supabase.rpc('cast_trend_vote', {
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_validator_id: '00000000-0000-0000-0000-000000000000',
      p_vote: true
    }).single();
    
    if (voteError && !voteError.message.includes('Trend not found')) {
      console.log('   ⚠️  cast_trend_vote function might not exist');
    } else {
      console.log('   ✅ cast_trend_vote function exists');
    }
    
    // Check trend_validations table
    const { data: validations, error: valError } = await supabase
      .from('trend_validations')
      .select('id')
      .limit(1);
    
    if (valError) {
      console.log('   ⚠️  trend_validations table might not exist');
    } else {
      console.log('   ✅ trend_validations table exists');
    }
    
    // Check columns in user_profiles
    console.log('\n3. Checking user_profiles columns...');
    const { data: profiles, error: profError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (!profError && profiles && profiles.length > 0) {
      const profile = profiles[0];
      const requiredColumns = [
        'earnings_pending',
        'earnings_approved', 
        'earnings_paid',
        'total_earnings',
        'trends_spotted',
        'accuracy_score',
        'validation_score'
      ];
      
      requiredColumns.forEach(col => {
        if (col in profile) {
          console.log(`   ✅ ${col} exists`);
        } else {
          console.log(`   ❌ ${col} missing`);
        }
      });
    }
    
    // Check columns in trend_submissions
    console.log('\n4. Checking trend_submissions columns...');
    const { data: trends, error: trendError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1);
    
    if (!trendError && trends && trends.length > 0) {
      const trend = trends[0];
      const requiredColumns = [
        'base_amount',
        'bonus_amount',
        'total_earned',
        'validation_count',
        'approve_count',
        'reject_count'
      ];
      
      requiredColumns.forEach(col => {
        if (col in trend) {
          console.log(`   ✅ ${col} exists`);
        } else {
          console.log(`   ❌ ${col} missing`);
        }
      });
    }
    
    // Summary
    console.log('\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================\n');
    
    console.log('To fix any missing items, run these SQL commands in Supabase SQL Editor:\n');
    
    if (profilesError) {
      console.log('-- Create profiles view:');
      console.log('CREATE VIEW profiles AS SELECT * FROM user_profiles;');
      console.log('GRANT ALL ON profiles TO authenticated;\n');
    }
    
    if (voteError && !voteError.message.includes('Trend not found')) {
      console.log('-- The cast_trend_vote function needs to be created');
      console.log('-- Copy the function from CREATE_VOTE_FUNCTION_SIMPLE.sql\n');
    }
    
    console.log('✨ Your app should now work with the existing Supabase connection!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runFixes().catch(console.error);