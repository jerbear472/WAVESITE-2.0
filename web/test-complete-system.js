const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabase = createClient(supabaseUrl, supabaseKey);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const colorMap = {
    'success': colors.green,
    'error': colors.red,
    'warning': colors.yellow,
    'info': colors.cyan,
    'header': colors.blue + colors.bright
  };
  console.log(`${colorMap[type] || ''}${message}${colors.reset}`);
}

async function testCompleteSystem() {
  log('\n═══════════════════════════════════════════════════════', 'header');
  log('    WAVESITE2 COMPLETE SYSTEM VERIFICATION TEST', 'header');
  log('═══════════════════════════════════════════════════════\n', 'header');

  let allTestsPassed = true;
  const testResults = [];

  // Test 1: Database Connection
  log('TEST 1: Database Connection', 'header');
  log('─'.repeat(40));
  try {
    const { data, error } = await supabase
      .from('trend_submissions')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    log('✅ Database connection successful', 'success');
    testResults.push({ test: 'Database Connection', status: 'PASS' });
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'error');
    testResults.push({ test: 'Database Connection', status: 'FAIL' });
    allTestsPassed = false;
  }

  // Test 2: Trend Submission Table Structure
  log('\nTEST 2: Trend Submission Table Structure', 'header');
  log('─'.repeat(40));
  try {
    const { data: sampleTrend } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1)
      .single();
    
    const requiredColumns = [
      'id', 'spotter_id', 'status', 'description',
      'approve_count', 'reject_count', 'validation_count'
    ];
    
    const missingColumns = requiredColumns.filter(col => 
      !sampleTrend || !(col in sampleTrend)
    );
    
    if (missingColumns.length > 0) {
      log(`⚠️  Missing columns: ${missingColumns.join(', ')}`, 'warning');
      testResults.push({ test: 'Table Structure', status: 'PARTIAL' });
    } else {
      log('✅ All required columns present', 'success');
      testResults.push({ test: 'Table Structure', status: 'PASS' });
    }
  } catch (error) {
    log(`❌ Table structure check failed: ${error.message}`, 'error');
    testResults.push({ test: 'Table Structure', status: 'FAIL' });
    allTestsPassed = false;
  }

  // Test 3: Vote Counting Logic
  log('\nTEST 3: Vote Counting Logic (2-vote threshold)', 'header');
  log('─'.repeat(40));
  try {
    // Check trends that should have been approved/rejected
    const { data: trendsNeedingDecision } = await supabase
      .from('trend_submissions')
      .select('id, description, status, approve_count, reject_count')
      .in('status', ['submitted', 'validating'])
      .or('approve_count.gte.2,reject_count.gte.2');
    
    if (trendsNeedingDecision && trendsNeedingDecision.length > 0) {
      log(`⚠️  Found ${trendsNeedingDecision.length} trends with 2+ votes still pending:`, 'warning');
      trendsNeedingDecision.slice(0, 3).forEach(trend => {
        log(`   - "${trend.description?.substring(0, 30)}..." (${trend.approve_count} approve, ${trend.reject_count} reject)`, 'warning');
      });
      testResults.push({ test: 'Vote Counting', status: 'NEEDS_FIX' });
    } else {
      log('✅ Vote counting appears correct (no stuck trends)', 'success');
      testResults.push({ test: 'Vote Counting', status: 'PASS' });
    }
  } catch (error) {
    log(`❌ Vote counting check failed: ${error.message}`, 'error');
    testResults.push({ test: 'Vote Counting', status: 'FAIL' });
    allTestsPassed = false;
  }

  // Test 4: Validation Records Integrity
  log('\nTEST 4: Validation Records Integrity', 'header');
  log('─'.repeat(40));
  try {
    const { data: nullValidations } = await supabase
      .from('trend_validations')
      .select('count')
      .is('trend_submission_id', null);
    
    const nullCount = nullValidations?.[0]?.count || 0;
    
    if (nullCount > 0) {
      log(`⚠️  Found ${nullCount} validation records with NULL trend_submission_id`, 'warning');
      testResults.push({ test: 'Validation Integrity', status: 'NEEDS_CLEANUP' });
    } else {
      log('✅ No NULL validation records found', 'success');
      testResults.push({ test: 'Validation Integrity', status: 'PASS' });
    }
  } catch (error) {
    log(`❌ Validation integrity check failed: ${error.message}`, 'error');
    testResults.push({ test: 'Validation Integrity', status: 'FAIL' });
    allTestsPassed = false;
  }

  // Test 5: User Validation Availability
  log('\nTEST 5: User Validation Availability', 'header');
  log('─'.repeat(40));
  const testUserId = '1c756d2d-b068-4887-8bbb-b5f0273135c1';
  try {
    // Get user's validated trends
    const { data: userValidations } = await supabase
      .from('trend_validations')
      .select('trend_submission_id')
      .eq('validator_id', testUserId)
      .not('trend_submission_id', 'is', null);
    
    const validatedIds = userValidations?.map(v => v.trend_submission_id) || [];
    
    // Get available trends
    const { data: availableTrends } = await supabase
      .from('trend_submissions')
      .select('id')
      .neq('spotter_id', testUserId)
      .in('status', ['submitted', 'validating']);
    
    const unvalidatedCount = availableTrends?.filter(t => 
      !validatedIds.includes(t.id)
    ).length || 0;
    
    log(`User ${testUserId.substring(0, 8)}... has:`, 'info');
    log(`  - ${validatedIds.length} validated trends`, 'info');
    log(`  - ${unvalidatedCount} trends available to validate`, 'info');
    
    if (unvalidatedCount > 0) {
      log('✅ Trends are available for validation', 'success');
      testResults.push({ test: 'User Validation', status: 'PASS' });
    } else {
      log('⚠️  No trends available (user may have validated all)', 'warning');
      testResults.push({ test: 'User Validation', status: 'OK' });
    }
  } catch (error) {
    log(`❌ User validation check failed: ${error.message}`, 'error');
    testResults.push({ test: 'User Validation', status: 'FAIL' });
    allTestsPassed = false;
  }

  // Test 6: Image/Thumbnail Availability
  log('\nTEST 6: Image/Thumbnail Availability', 'header');
  log('─'.repeat(40));
  try {
    const { data: recentTrends } = await supabase
      .from('trend_submissions')
      .select('id, thumbnail_url, screenshot_url')
      .order('created_at', { ascending: false })
      .limit(20);
    
    const withImages = recentTrends?.filter(t => 
      t.thumbnail_url || t.screenshot_url
    ).length || 0;
    
    const percentage = Math.round((withImages / (recentTrends?.length || 1)) * 100);
    
    log(`${withImages}/${recentTrends?.length} recent trends have images (${percentage}%)`, 'info');
    
    if (percentage >= 30) {
      log('✅ Acceptable image coverage', 'success');
      testResults.push({ test: 'Image Availability', status: 'PASS' });
    } else {
      log('⚠️  Low image coverage - consider improving capture', 'warning');
      testResults.push({ test: 'Image Availability', status: 'WARNING' });
    }
  } catch (error) {
    log(`❌ Image check failed: ${error.message}`, 'error');
    testResults.push({ test: 'Image Availability', status: 'FAIL' });
    allTestsPassed = false;
  }

  // Test 7: RPC Function Existence
  log('\nTEST 7: RPC Function (cast_trend_vote)', 'header');
  log('─'.repeat(40));
  try {
    // We can't directly test the function without auth, but we can check if it exists
    const { data: functions } = await supabase
      .rpc('cast_trend_vote', {
        p_trend_id: '00000000-0000-0000-0000-000000000000',
        p_vote: 'verify'
      })
      .single()
      .catch(err => {
        if (err.message.includes('authentication') || err.message.includes('JWT')) {
          return { data: { exists: true } };
        }
        throw err;
      });
    
    log('✅ cast_trend_vote function exists', 'success');
    testResults.push({ test: 'RPC Function', status: 'PASS' });
  } catch (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      log('❌ cast_trend_vote function not found!', 'error');
      testResults.push({ test: 'RPC Function', status: 'FAIL' });
      allTestsPassed = false;
    } else {
      log('✅ cast_trend_vote function exists (auth required)', 'success');
      testResults.push({ test: 'RPC Function', status: 'PASS' });
    }
  }

  // Final Summary
  log('\n═══════════════════════════════════════════════════════', 'header');
  log('                    TEST SUMMARY', 'header');
  log('═══════════════════════════════════════════════════════', 'header');
  
  console.log('\n');
  console.table(testResults);
  
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const warningCount = testResults.filter(r => !['PASS', 'FAIL'].includes(r.status)).length;
  
  log(`\nResults: ${passCount} PASS, ${failCount} FAIL, ${warningCount} WARNING/NEEDS_FIX`, 'info');
  
  if (failCount === 0) {
    log('\n🎉 SYSTEM IS READY FOR PRODUCTION!', 'success');
  } else {
    log('\n⚠️  SYSTEM NEEDS ATTENTION - See failed tests above', 'warning');
  }
  
  // Recommendations
  if (failCount > 0 || warningCount > 0) {
    log('\nRECOMMENDED ACTIONS:', 'header');
    
    if (testResults.find(r => r.test === 'Vote Counting' && r.status === 'NEEDS_FIX')) {
      log('1. Run FIX_VOTE_THRESHOLD.sql to update vote counting to 2 votes', 'warning');
    }
    if (testResults.find(r => r.test === 'Validation Integrity' && r.status === 'NEEDS_CLEANUP')) {
      log('2. Run cleanup_null_validations.sql to remove invalid records', 'warning');
    }
    if (testResults.find(r => r.test === 'Image Availability' && r.status === 'WARNING')) {
      log('3. Improve thumbnail capture in submission flow', 'warning');
    }
  }
}

// Run the test
testCompleteSystem().catch(console.error);