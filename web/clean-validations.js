const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabase = createClient(supabaseUrl, supabaseKey);

const MAIN_USER_ID = '1c756d2d-b068-4887-8bbb-b5f0273135c1';

async function cleanValidations() {
  console.log('Cleaning Validation Records');
  console.log('============================\n');
  
  // 1. Find and remove null validation records
  const { data: nullValidations, error: nullError } = await supabase
    .from('trend_validations')
    .select('*')
    .is('trend_submission_id', null);
  
  if (nullValidations && nullValidations.length > 0) {
    console.log(`Found ${nullValidations.length} validation records with NULL trend_submission_id`);
    
    // Delete these invalid records
    const { error: deleteError } = await supabase
      .from('trend_validations')
      .delete()
      .is('trend_submission_id', null);
    
    if (deleteError) {
      console.error('Error deleting null records:', deleteError);
    } else {
      console.log('✅ Deleted invalid validation records');
    }
  } else {
    console.log('No invalid validation records found');
  }
  
  // 2. Now simulate the exact query the validate page uses
  console.log('\n\nSimulating Validate Page Query:');
  console.log('================================\n');
  
  // Get already validated trends by this user (excluding nulls)
  const { data: validatedTrends, error: validationError } = await supabase
    .from('trend_validations')
    .select('trend_submission_id')
    .eq('validator_id', MAIN_USER_ID)
    .not('trend_submission_id', 'is', null);

  if (validationError) {
    console.error('Error loading validated trends:', validationError);
    return;
  }

  const validatedIds = validatedTrends?.map(v => v.trend_submission_id).filter(id => id !== null) || [];
  console.log(`User has validated ${validatedIds.length} trends (excluding nulls)`);
  
  // Build query for trends to validate
  let query = supabase
    .from('trend_submissions')
    .select(`
      id,
      spotter_id,
      category,
      description,
      screenshot_url,
      thumbnail_url,
      platform,
      creator_handle,
      creator_name,
      post_caption,
      likes_count,
      comments_count,
      shares_count,
      views_count,
      hashtags,
      post_url,
      posted_at,
      virality_prediction,
      quality_score,
      validation_count,
      approve_count,
      reject_count,
      status,
      created_at,
      updated_at
    `)
    .neq('spotter_id', MAIN_USER_ID);
  
  // Exclude already validated trends
  if (validatedIds.length > 0) {
    // Use a different approach for the NOT IN clause
    const validatedIdsString = validatedIds.map(id => `'${id}'`).join(',');
    query = query.filter('id', 'not.in', `(${validatedIdsString})`);
  }
  
  // Get trends that need validation
  const { data: trendsData, error } = await query
    .in('status', ['submitted', 'validating'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error loading trends:', error);
    return;
  }

  console.log(`\n✅ TRENDS AVAILABLE FOR VALIDATION: ${trendsData?.length || 0}\n`);
  
  if (trendsData && trendsData.length > 0) {
    console.log('First 5 available trends:');
    trendsData.slice(0, 5).forEach((trend, i) => {
      const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
      console.log(`\n${i + 1}. ${trend.description}`);
      console.log(`   ID: ${trend.id}`);
      console.log(`   Status: ${trend.status}`);
      console.log(`   Created: ${hoursAgo} hours ago`);
      console.log(`   Has thumbnail: ${!!trend.thumbnail_url}`);
      console.log(`   Has screenshot: ${!!trend.screenshot_url}`);
    });
    
    console.log('\n\n🎯 THESE TRENDS SHOULD NOW BE VISIBLE IN THE VALIDATION PAGE!');
    console.log('Go to http://localhost:3000/validate and check if they appear.');
  } else {
    console.log('No trends available for validation after cleanup.');
  }
}

cleanValidations().catch(console.error);