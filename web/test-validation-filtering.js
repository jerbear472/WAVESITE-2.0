// Test validation filtering to ensure users don't see trends they've already voted on
// Run with: node test-validation-filtering.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testValidationFiltering() {
  console.log('🔍 TESTING VALIDATION FILTERING');
  console.log('===============================\n');

  try {
    // Check if we have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ No active session. Please log in through the web app first.');
      return;
    }

    const userId = session.user.id;
    console.log('✅ Testing with user:', session.user.email);
    console.log('User ID:', userId);

    // Step 1: Get all validations by this user
    console.log('\n📊 Getting user\'s validation history...');
    const { data: validatedTrends, error: validationError } = await supabase
      .from('trend_validations')
      .select('trend_id, confirmed, created_at')
      .eq('validator_id', userId)
      .order('created_at', { ascending: false });

    if (validationError) {
      console.error('❌ Error loading validations:', validationError);
      return;
    }

    console.log(`Found ${validatedTrends?.length || 0} previous validations by this user`);
    
    if (validatedTrends && validatedTrends.length > 0) {
      console.log('Recent validations:');
      validatedTrends.slice(0, 5).forEach((v, i) => {
        console.log(`  ${i + 1}. Trend: ${v.trend_id.substring(0, 8)}... - ${v.confirmed ? '✅ Approved' : '❌ Rejected'} - ${new Date(v.created_at).toLocaleString()}`);
      });
    }

    const validatedIds = validatedTrends?.map(v => v.trend_id) || [];
    
    // Step 2: Get all available trends (excluding user's own)
    console.log('\n📝 Getting available trends for validation...');
    const { data: availableTrends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id, description, created_at, spotter_id')
      .neq('spotter_id', userId)
      .in('status', ['submitted', 'validating'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (trendsError) {
      console.error('❌ Error loading trends:', trendsError);
      return;
    }

    console.log(`Found ${availableTrends?.length || 0} trends available for validation`);

    // Step 3: Filter out already validated trends
    const filteredTrends = availableTrends?.filter(trend => 
      !validatedIds.includes(trend.id)
    ) || [];

    console.log(`After filtering: ${filteredTrends.length} trends should show in validation queue`);

    // Step 4: Check for overlap (this should be empty)
    const overlap = availableTrends?.filter(trend => 
      validatedIds.includes(trend.id)
    ) || [];

    console.log(`\n🔍 FILTERING VERIFICATION:`);
    console.log(`=======================`);
    console.log(`Total available trends: ${availableTrends?.length || 0}`);
    console.log(`User's validated trends: ${validatedIds.length}`);
    console.log(`After filtering: ${filteredTrends.length}`);
    console.log(`Overlap (should be 0): ${overlap.length}`);

    if (overlap.length > 0) {
      console.log('\n⚠️  Found overlap - these trends should be filtered out:');
      overlap.forEach((trend, i) => {
        console.log(`  ${i + 1}. ${trend.id.substring(0, 8)}... - ${trend.description.substring(0, 50)}...`);
      });
    } else {
      console.log('\n✅ No overlap found - filtering is working correctly!');
    }

    // Step 5: Show what should appear in validation queue
    console.log(`\n📋 TRENDS THAT SHOULD APPEAR IN VALIDATION QUEUE:`);
    console.log(`================================================`);
    
    if (filteredTrends.length > 0) {
      filteredTrends.slice(0, 5).forEach((trend, i) => {
        console.log(`${i + 1}. ${trend.id.substring(0, 8)}... - ${trend.description.substring(0, 60)}...`);
        console.log(`   Created: ${new Date(trend.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('No trends available for validation (either all validated or no trends exist)');
    }

    console.log(`\n🎯 SUMMARY:`);
    console.log(`==========`);
    console.log(`✅ Query should use 'trend_id' field (not 'trend_submission_id')`);
    console.log(`✅ Filtering logic should work correctly`);
    console.log(`✅ User should see ${filteredTrends.length} trends in validation queue`);

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testValidationFiltering().catch(console.error);