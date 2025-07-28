// Diagnostic script to find the exact submission error
// Run this in browser console on the /submit page

async function diagnoseSubmissionError() {
  console.log('=== Diagnosing Submission Error ===\n');
  
  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Authentication Error:', authError);
    return;
  }
  console.log('✅ User authenticated:', user.id);

  // 2. Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!profile) {
    console.error('❌ Profile not found:', profileError);
    console.log('\n🔧 Fix: Create profile with this SQL:');
    console.log(`INSERT INTO profiles (id, email, username) VALUES ('${user.id}', '${user.email}', '${user.email.split('@')[0]}');`);
  } else {
    console.log('✅ Profile exists');
  }

  // 3. Test minimal submission
  console.log('\n=== Testing Minimal Submission ===');
  
  const testData = {
    spotter_id: user.id,
    category: 'meme_format',
    description: 'Test submission',
    evidence: {},
    virality_prediction: 5,
    status: 'pending',
    quality_score: 0.5
  };

  const { data: result, error: submitError } = await supabase
    .from('trend_submissions')
    .insert(testData)
    .select();

  if (submitError) {
    console.error('❌ Submission Error:', submitError);
    console.error('Error Details:', {
      message: submitError.message,
      details: submitError.details,
      hint: submitError.hint,
      code: submitError.code
    });

    // Specific error handlers
    if (submitError.message?.includes('profiles')) {
      console.log('\n🔧 Profile Fix Needed');
      console.log('Run this SQL in Supabase:');
      console.log(`
-- Ensure profile exists
INSERT INTO profiles (id, email, username, created_at)
VALUES ('${user.id}', '${user.email}', '${user.email.split('@')[0]}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify it worked
SELECT * FROM profiles WHERE id = '${user.id}';
      `);
    } else if (submitError.message?.includes('permission denied')) {
      console.log('\n🔧 Permission Fix Needed');
      console.log('Check RLS policies in Supabase');
    } else if (submitError.message?.includes('column')) {
      const match = submitError.message.match(/column "(\w+)"/);
      console.log(`\n🔧 Missing column: ${match?.[1] || 'unknown'}`);
    }
  } else {
    console.log('✅ Test submission successful!');
    console.log('Result:', result);
    
    // Clean up
    if (result?.[0]?.id) {
      await supabase.from('trend_submissions').delete().eq('id', result[0].id);
      console.log('✅ Test data cleaned up');
    }
  }

  // 4. Check table structure
  console.log('\n=== Checking Required Columns ===');
  const requiredColumns = [
    'spotter_id', 'category', 'description', 'evidence', 
    'virality_prediction', 'status', 'quality_score'
  ];
  
  console.log('Required columns for submission:', requiredColumns);
  console.log('\nRun this SQL to check your table:');
  console.log(`
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trend_submissions'
ORDER BY ordinal_position;
  `);
}

// Auto-run
diagnoseSubmissionError();