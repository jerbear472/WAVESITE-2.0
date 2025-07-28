// Simple test script to verify trend submission works
// Run this in the browser console on the /submit page

async function testTrendSubmission() {
  console.log('=== Testing Trend Submission (No Umbrellas) ===');
  
  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not authenticated. Please log in first.');
    return;
  }
  console.log('✅ Authenticated as:', user.email);

  // 2. Create minimal test data
  const testData = {
    spotter_id: user.id,
    category: 'meme_format',
    description: 'Test trend submission - no umbrellas',
    screenshot_url: null,
    evidence: {
      url: 'https://tiktok.com/test',
      title: 'Test Trend',
      platform: 'tiktok',
      // Store all the rich form data in evidence JSONB
      ageRanges: ['Gen Z (15-24)'],
      categories: ['Humor & Memes'],
      moods: ['Funny'],
      spreadSpeed: 'picking_up',
      motivation: 'Testing submission',
      firstSeen: 'today',
      otherPlatforms: [],
      brandAdoption: false
    },
    virality_prediction: 5,
    status: 'pending',
    quality_score: 0.5,
    created_at: new Date().toISOString(),
    // Social media metadata
    creator_handle: '@testuser',
    post_caption: 'Test caption',
    likes_count: 100,
    views_count: 1000,
    hashtags: ['test', 'trend']
  };

  console.log('Submitting test data:', testData);

  // 3. Test submission
  const { data: submission, error: submitError } = await supabase
    .from('trend_submissions')
    .insert(testData)
    .select()
    .single();

  if (submitError) {
    console.error('❌ Submission failed:', submitError);
    
    // Provide specific fixes
    if (submitError.message?.includes('trend_umbrella')) {
      console.log('\n🔧 Fix: Run fix-trend-submission-simple.sql in Supabase SQL Editor');
      console.log('This will remove all umbrella references and ensure the table is properly configured.');
    } else if (submitError.message?.includes('foreign key')) {
      console.log('\n🔧 Fix: Ensure your user exists in the profiles table');
    } else if (submitError.message?.includes('permission denied')) {
      console.log('\n🔧 Fix: Check RLS policies - user needs INSERT permission');
    }
    
    return;
  }

  console.log('✅ Submission successful!', submission);
  console.log('Submission ID:', submission.id);
  console.log('All form data stored in evidence field:', submission.evidence);

  // 4. Verify we can read it back
  const { data: verify, error: verifyError } = await supabase
    .from('trend_submissions')
    .select('*')
    .eq('id', submission.id)
    .single();

  if (verify) {
    console.log('✅ Verified submission can be read back:', verify);
  }

  // 5. Clean up test submission
  const { error: deleteError } = await supabase
    .from('trend_submissions')
    .delete()
    .eq('id', submission.id);

  if (!deleteError) {
    console.log('✅ Test submission cleaned up successfully');
  }

  console.log('\n=== Test Complete ===');
  console.log('The submission system works without trend umbrellas!');
  console.log('All form fields are stored in the evidence JSONB column.');
}

// Instructions
console.log('Instructions:');
console.log('1. First run the SQL fix in Supabase:');
console.log('   - Go to Supabase SQL Editor');
console.log('   - Run the contents of fix-trend-submission-simple.sql');
console.log('2. Then run: testTrendSubmission()');
console.log('\nThis will test if trends can be submitted without the umbrella feature.');