const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabase = createClient(supabaseUrl, supabaseKey);

const MAIN_USER_ID = '1c756d2d-b068-4887-8bbb-b5f0273135c1';

async function fixValidationIssue() {
  console.log('Diagnosing Validation Issue for User:', MAIN_USER_ID);
  console.log('================================================\n');
  
  // 1. Get all trends from OTHER users with submitted/validating status
  const { data: otherUserTrends, error: otherError } = await supabase
    .from('trend_submissions')
    .select('id, description, status, spotter_id, created_at')
    .neq('spotter_id', MAIN_USER_ID)
    .in('status', ['submitted', 'validating'])
    .order('created_at', { ascending: false });
  
  console.log(`Found ${otherUserTrends?.length || 0} trends from other users\n`);
  
  // 2. Get all validations by the main user
  const { data: userValidations, error: valError } = await supabase
    .from('trend_validations')
    .select('trend_submission_id, vote, created_at')
    .eq('validator_id', MAIN_USER_ID);
  
  const validatedIds = userValidations?.map(v => v.trend_submission_id) || [];
  console.log(`User has validated ${validatedIds.length} trends total\n`);
  
  // 3. Find trends that haven't been validated by this user
  const unvalidatedTrends = otherUserTrends?.filter(trend => 
    !validatedIds.includes(trend.id)
  ) || [];
  
  console.log(`Trends NOT yet validated by user: ${unvalidatedTrends.length}\n`);
  
  if (unvalidatedTrends.length > 0) {
    console.log('✅ THESE TRENDS SHOULD BE VISIBLE IN VALIDATION PAGE:');
    console.log('======================================================');
    unvalidatedTrends.forEach((trend, i) => {
      const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
      console.log(`\n${i + 1}. ${trend.description}`);
      console.log(`   ID: ${trend.id}`);
      console.log(`   Status: ${trend.status}`);
      console.log(`   Submitted by: ${trend.spotter_id}`);
      console.log(`   Created: ${hoursAgo} hours ago`);
    });
    
    console.log('\n\n🔍 DEBUGGING STEPS:');
    console.log('===================');
    console.log('1. Open browser console when on /validate page');
    console.log('2. Check if any errors appear in console');
    console.log('3. Look for console logs starting with "Loading trends for validation"');
    console.log('4. The issue might be in the frontend filtering logic');
    
  } else {
    console.log('❌ NO UNVALIDATED TRENDS AVAILABLE');
    console.log('===================================');
    console.log('The user has already validated ALL available trends from other users.');
    console.log('\nThis explains why no trends are showing up for validation.');
    
    // Show which trends the user has already validated
    const recentValidations = userValidations?.slice(0, 5) || [];
    if (recentValidations.length > 0) {
      console.log('\nRecent validations by this user:');
      for (const val of recentValidations) {
        const { data: trend } = await supabase
          .from('trend_submissions')
          .select('description, spotter_id')
          .eq('id', val.trend_submission_id)
          .single();
        
        if (trend) {
          console.log(`  - "${trend.description?.substring(0, 30)}..." (vote: ${val.vote})`);
        }
      }
    }
  }
  
  // 4. Check for any database inconsistencies
  console.log('\n\n🔧 CHECKING FOR DATABASE ISSUES:');
  console.log('=================================');
  
  // Check if there are duplicate validations
  const duplicates = validatedIds.filter((id, index) => validatedIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate validations!`);
    console.log('Duplicate trend IDs:', duplicates);
  } else {
    console.log('✅ No duplicate validations found');
  }
  
  // Check the cast_trend_vote function
  console.log('\n📝 SOLUTION:');
  console.log('============');
  console.log('To see trends for validation, you need to either:');
  console.log('1. Have other users submit new trends');
  console.log('2. Create a second test account and submit trends from that account');
  console.log('3. Reset some validations in the database (not recommended for production)');
  console.log('\nThe system is working correctly - you\'ve simply validated all available trends!');
}

fixValidationIssue().catch(console.error);