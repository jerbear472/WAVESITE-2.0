// Test trend submission on production
// Run this in browser console on your Vercel deployment after running the SQL fix

async function testTrendSubmission() {
  console.log('🧪 Testing Trend Submission on Production');
  console.log('========================================');
  
  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Not authenticated:', authError);
    return;
  }
  
  console.log('✅ Authenticated as:', user.email);
  
  // 2. Check if user has profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError) {
    console.error('❌ No profile found. Creating one...');
    
    // Create profile
    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        username: user.email.split('@')[0],
        created_at: new Date().toISOString()
      });
    
    if (createError) {
      console.error('❌ Failed to create profile:', createError);
      return;
    }
    console.log('✅ Profile created');
  } else {
    console.log('✅ Profile exists:', profile.username);
  }
  
  // 3. Test minimal submission
  console.log('\n📝 Testing minimal submission...');
  
  const minimalData = {
    spotter_id: user.id,
    category: 'test',
    description: 'Test submission from production',
    evidence: { test: true },
    virality_prediction: 5,
    status: 'submitted',
    quality_score: 0.50,
    validation_count: 0,
    created_at: new Date().toISOString()
  };
  
  const { data: testSubmit, error: submitError } = await supabase
    .from('trend_submissions')
    .insert(minimalData)
    .select()
    .single();
  
  if (submitError) {
    console.error('❌ Minimal submission failed:', submitError);
    console.log('Error details:', {
      message: submitError.message,
      code: submitError.code,
      details: submitError.details
    });
    return;
  }
  
  console.log('✅ Minimal submission successful!');
  
  // Clean up test data
  await supabase.from('trend_submissions').delete().eq('id', testSubmit.id);
  console.log('🧹 Test data cleaned up');
  
  // 4. Test full submission with metadata
  console.log('\n📝 Testing full submission with metadata...');
  
  const fullData = {
    spotter_id: user.id,
    category: 'meme_format',
    description: 'Khaby Lame simplifying life hacks',
    evidence: {
      url: 'https://www.tiktok.com/@khaby.lame/video/7137423965982686469',
      platform: 'tiktok'
    },
    virality_prediction: 8,
    status: 'submitted',
    quality_score: 0.85,
    validation_count: 0,
    // Social media metadata
    creator_handle: '@khaby.lame',
    creator_name: 'Khaby Lame',
    post_caption: 'Simple solutions to complicated problems',
    likes_count: 1500000,
    views_count: 25000000,
    comments_count: 50000,
    hashtags: ['simple', 'lifehack', 'funny'],
    post_url: 'https://www.tiktok.com/@khaby.lame/video/7137423965982686469',
    thumbnail_url: 'https://example.com/thumbnail.jpg',
    posted_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  
  const { data: fullSubmit, error: fullError } = await supabase
    .from('trend_submissions')
    .insert(fullData)
    .select()
    .single();
  
  if (fullError) {
    console.error('❌ Full submission failed:', fullError);
    return;
  }
  
  console.log('✅ Full submission successful with all metadata!');
  console.log('Submitted data:', fullSubmit);
  
  // Clean up
  await supabase.from('trend_submissions').delete().eq('id', fullSubmit.id);
  console.log('🧹 Test data cleaned up');
  
  console.log('\n🎉 All tests passed! Trend submission is working!');
  console.log('The form should now work properly with metadata extraction.');
}

// Run the test
testTrendSubmission();