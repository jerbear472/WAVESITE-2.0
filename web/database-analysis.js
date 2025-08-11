const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabaseTables() {
  console.log('='.repeat(80));
  console.log('COMPLETE DATABASE ANALYSIS FOR TREND VALIDATION SYSTEM');
  console.log('='.repeat(80));
  console.log('\n');

  // 1. ANALYZE TREND_SUBMISSIONS TABLE
  console.log('1. TREND_SUBMISSIONS TABLE ANALYSIS');
  console.log('-'.repeat(40));
  
  const { data: allTrends, error: trendsError } = await supabase
    .from('trend_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (trendsError) {
    console.error('Error fetching trends:', trendsError);
    return;
  }
  
  // Group by status
  const statusGroups = allTrends.reduce((acc, trend) => {
    acc[trend.status] = (acc[trend.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`Total trends: ${allTrends.length}`);
  console.log('\nBreakdown by status:');
  Object.entries(statusGroups).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // Group by spotter
  const spotterGroups = allTrends.reduce((acc, trend) => {
    acc[trend.spotter_id] = (acc[trend.spotter_id] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nTop trend submitters:');
  Object.entries(spotterGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([spotterId, count]) => {
      console.log(`  ${spotterId.substring(0, 8)}...: ${count} trends`);
    });
  
  // Check for data integrity issues
  console.log('\nData integrity checks:');
  const trendsWithNullSpotter = allTrends.filter(t => !t.spotter_id).length;
  const trendsWithNullStatus = allTrends.filter(t => !t.status).length;
  const trendsWithImages = allTrends.filter(t => t.thumbnail_url || t.screenshot_url).length;
  
  console.log(`  Trends with null spotter_id: ${trendsWithNullSpotter}`);
  console.log(`  Trends with null status: ${trendsWithNullStatus}`);
  console.log(`  Trends with images: ${trendsWithImages}/${allTrends.length} (${Math.round(trendsWithImages/allTrends.length*100)}%)`);
  
  // 2. ANALYZE TREND_VALIDATIONS TABLE
  console.log('\n\n2. TREND_VALIDATIONS TABLE ANALYSIS');
  console.log('-'.repeat(40));
  
  const { data: allValidations, error: valError } = await supabase
    .from('trend_validations')
    .select('*');
  
  if (valError) {
    console.error('Error fetching validations:', valError);
    return;
  }
  
  console.log(`Total validations: ${allValidations.length}`);
  
  // Check for null values
  const nullTrendIds = allValidations.filter(v => !v.trend_submission_id).length;
  const nullValidatorIds = allValidations.filter(v => !v.validator_id).length;
  
  console.log('\nData integrity checks:');
  console.log(`  Validations with null trend_submission_id: ${nullTrendIds}`);
  console.log(`  Validations with null validator_id: ${nullValidatorIds}`);
  
  // Group by vote type
  const voteGroups = allValidations.reduce((acc, val) => {
    acc[val.vote] = (acc[val.vote] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nVote breakdown:');
  Object.entries(voteGroups).forEach(([vote, count]) => {
    console.log(`  ${vote}: ${count}`);
  });
  
  // Top validators
  const validatorGroups = allValidations.reduce((acc, val) => {
    if (val.validator_id) {
      acc[val.validator_id] = (acc[val.validator_id] || 0) + 1;
    }
    return acc;
  }, {});
  
  console.log('\nTop validators:');
  Object.entries(validatorGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([validatorId, count]) => {
      console.log(`  ${validatorId.substring(0, 8)}...: ${count} validations`);
    });
  
  // 3. VALIDATION FLOW ANALYSIS
  console.log('\n\n3. VALIDATION FLOW ANALYSIS');
  console.log('-'.repeat(40));
  
  // Find trends that should be available for validation
  const eligibleTrends = allTrends.filter(t => 
    t.status === 'submitted' || t.status === 'validating'
  );
  
  console.log(`\nTrends eligible for validation: ${eligibleTrends.length}`);
  
  // For each eligible trend, check validation status
  const validationStatus = await Promise.all(
    eligibleTrends.slice(0, 10).map(async (trend) => {
      const { data: validations } = await supabase
        .from('trend_validations')
        .select('validator_id, vote')
        .eq('trend_submission_id', trend.id);
      
      return {
        id: trend.id,
        description: trend.description?.substring(0, 30),
        spotter_id: trend.spotter_id,
        validation_count: validations?.length || 0,
        approve_count: validations?.filter(v => v.vote === 'verify').length || 0,
        reject_count: validations?.filter(v => v.vote === 'reject').length || 0,
      };
    })
  );
  
  console.log('\nSample of eligible trends and their validation status:');
  validationStatus.forEach((trend, i) => {
    console.log(`\n${i + 1}. ${trend.description}...`);
    console.log(`   Validations: ${trend.validation_count}`);
    console.log(`   Approvals: ${trend.approve_count}`);
    console.log(`   Rejections: ${trend.reject_count}`);
    console.log(`   Submitted by: ${trend.spotter_id.substring(0, 8)}...`);
  });
  
  // 4. SPECIFIC USER ANALYSIS
  console.log('\n\n4. USER-SPECIFIC VALIDATION AVAILABILITY');
  console.log('-'.repeat(40));
  
  const testUserId = '1c756d2d-b068-4887-8bbb-b5f0273135c1';
  console.log(`\nAnalyzing for user: ${testUserId}`);
  
  // Get user's own trends
  const userTrends = allTrends.filter(t => t.spotter_id === testUserId);
  console.log(`  User's own trends: ${userTrends.length}`);
  
  // Get user's validations
  const userValidations = allValidations.filter(v => v.validator_id === testUserId);
  const userValidatedTrendIds = userValidations
    .map(v => v.trend_submission_id)
    .filter(id => id != null);
  
  console.log(`  User's validations: ${userValidations.length}`);
  
  // Find trends user can validate
  const trendsUserCanValidate = eligibleTrends.filter(trend => 
    trend.spotter_id !== testUserId && // Not user's own trend
    !userValidatedTrendIds.includes(trend.id) // Not already validated
  );
  
  console.log(`  Trends available for user to validate: ${trendsUserCanValidate.length}`);
  
  if (trendsUserCanValidate.length > 0) {
    console.log('\n  First 5 available trends:');
    trendsUserCanValidate.slice(0, 5).forEach((trend, i) => {
      console.log(`    ${i + 1}. ${trend.description?.substring(0, 40)}...`);
      console.log(`       ID: ${trend.id}`);
      console.log(`       Status: ${trend.status}`);
    });
  }
  
  // 5. CHECK FOR COMMON ISSUES
  console.log('\n\n5. COMMON ISSUES CHECK');
  console.log('-'.repeat(40));
  
  // Check for orphaned validations
  const trendIds = new Set(allTrends.map(t => t.id));
  const orphanedValidations = allValidations.filter(v => 
    v.trend_submission_id && !trendIds.has(v.trend_submission_id)
  );
  
  console.log(`\nOrphaned validations (referencing non-existent trends): ${orphanedValidations.length}`);
  
  // Check for duplicate validations
  const validationPairs = new Set();
  const duplicates = [];
  
  allValidations.forEach(v => {
    if (v.trend_submission_id && v.validator_id) {
      const pair = `${v.trend_submission_id}-${v.validator_id}`;
      if (validationPairs.has(pair)) {
        duplicates.push(v);
      }
      validationPairs.add(pair);
    }
  });
  
  console.log(`Duplicate validations (same user voting multiple times): ${duplicates.length}`);
  
  // Check for trends stuck in 'validating' status
  const validatingTrends = allTrends.filter(t => t.status === 'validating');
  console.log(`\nTrends stuck in 'validating' status: ${validatingTrends.length}`);
  
  if (validatingTrends.length > 0) {
    const oldValidatingTrends = validatingTrends.filter(t => {
      const hoursAgo = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
      return hoursAgo > 24;
    });
    console.log(`  Older than 24 hours: ${oldValidatingTrends.length}`);
  }
  
  // 6. RECOMMENDATIONS
  console.log('\n\n6. RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  if (nullTrendIds > 0) {
    console.log('⚠️  Clean up validation records with null trend_submission_id');
  }
  
  if (duplicates.length > 0) {
    console.log('⚠️  Remove duplicate validation records');
  }
  
  if (trendsUserCanValidate.length === 0) {
    console.log('⚠️  User has validated all available trends or all trends are their own');
    console.log('   Solution: Have other users submit trends or create test accounts');
  } else {
    console.log('✅  Trends are available for validation');
  }
  
  const imagePercentage = Math.round(trendsWithImages/allTrends.length*100);
  if (imagePercentage < 50) {
    console.log(`⚠️  Only ${imagePercentage}% of trends have images`);
    console.log('   Consider improving image capture in submission flow');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
}

analyzeDatabaseTables().catch(console.error);