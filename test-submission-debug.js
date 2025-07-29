// Debug helper to test trend submission
// Run this in the browser console on the timeline page

async function testSubmission() {
  console.log('🧪 Starting submission test...');
  
  // Test 1: Check Supabase connection
  console.log('\n📡 Test 1: Checking Supabase connection...');
  try {
    const { createClient } = await import('/utils/supabase/client.js');
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    console.log('✅ Auth OK:', user.email);
    
    // Test database connection
    const { count, error: dbError } = await supabase
      .from('trend_submissions')
      .select('*', { count: 'exact', head: true });
    if (dbError) throw dbError;
    console.log('✅ Database OK: Total trends:', count);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return;
  }
  
  // Test 2: Check storage bucket
  console.log('\n🗄️ Test 2: Checking storage bucket...');
  try {
    const { createClient } = await import('/utils/supabase/client.js');
    const supabase = createClient();
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    
    const trendBucket = buckets.find(b => b.name === 'trend-images');
    if (trendBucket) {
      console.log('✅ Storage bucket exists:', trendBucket.name);
    } else {
      console.log('⚠️ Storage bucket not found, will be created on first upload');
    }
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  }
  
  // Test 3: Try a minimal submission
  console.log('\n🚀 Test 3: Attempting minimal submission...');
  try {
    const { createClient } = await import('/utils/supabase/client.js');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const testData = {
      spotter_id: user.id,
      category: 'meme_format',
      description: `Test submission at ${new Date().toISOString()}`,
      url: 'https://example.com/test',
      platform: 'other',
      title: 'Debug Test Trend',
      posted_at: new Date().toISOString()
    };
    
    console.log('📝 Submitting test data:', testData);
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Submission failed:', error);
    } else {
      console.log(`✅ Test submission successful in ${duration}ms!`);
      console.log('📄 Created trend:', data);
      
      // Clean up test trend
      console.log('🧹 Cleaning up test trend...');
      await supabase
        .from('trend_submissions')
        .delete()
        .eq('id', data.id);
    }
  } catch (error) {
    console.error('❌ Submission test failed:', error);
  }
  
  // Test 4: Check for duplicate URL issues
  console.log('\n🔍 Test 4: Checking recent submissions for patterns...');
  try {
    const { createClient } = await import('/utils/supabase/client.js');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: recent, error } = await supabase
      .from('trend_submissions')
      .select('id, url, created_at, description')
      .eq('spotter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && recent) {
      console.log('📋 Your recent submissions:');
      recent.forEach((trend, i) => {
        console.log(`${i + 1}. ${trend.url || 'No URL'} - ${new Date(trend.created_at).toLocaleString()}`);
      });
    }
  } catch (error) {
    console.error('❌ Recent check failed:', error);
  }
  
  console.log('\n✅ All tests completed!');
  console.log('💡 If submission is still hanging, check the Network tab for pending requests');
}

// Auto-run the test
testSubmission();

// Also export for manual use
window.testSubmission = testSubmission;

// Quick submission bypassing the form
window.quickSubmit = async function(url, title = 'Quick Test') {
  console.log('⚡ Quick submitting:', url);
  
  try {
    const { createClient } = await import('/utils/supabase/client.js');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert({
        spotter_id: user.id,
        category: 'meme_format',
        description: title,
        url: url,
        platform: 'other',
        title: title,
        posted_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Quick submit failed:', error);
    } else {
      console.log('✅ Quick submit successful:', data);
      // Refresh the page to see the new trend
      window.location.reload();
    }
  } catch (error) {
    console.error('❌ Quick submit error:', error);
  }
};

console.log('💡 Use quickSubmit("https://example.com", "Test Title") to bypass the form');