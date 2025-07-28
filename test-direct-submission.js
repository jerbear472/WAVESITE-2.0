// Test direct Supabase submission to diagnose hanging issue
// Run this in the browser console while logged in

async function testDirectSubmission() {
  console.log('🧪 Testing direct Supabase submission...');
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not authenticated');
    return;
  }
  console.log('✅ Authenticated as:', user.email);
  
  // Create minimal test data
  const testData = {
    spotter_id: user.id,
    category: 'meme_format',
    description: 'Direct test submission',
    evidence: {
      url: 'https://example.com',
      title: 'Test',
      platform: 'other'
    },
    virality_prediction: 5,
    status: 'pending',
    quality_score: 0.5,
    validation_count: 0
  };
  
  console.log('📤 Submitting test data:', testData);
  console.log('Starting at:', new Date().toISOString());
  
  try {
    // Test 1: Try without select
    console.log('\n1️⃣ Testing insert without select...');
    const start1 = Date.now();
    const { error: insertError } = await supabase
      .from('trend_submissions')
      .insert(testData);
    
    const duration1 = Date.now() - start1;
    console.log(`Insert took: ${duration1}ms`);
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return;
    }
    
    console.log('✅ Insert successful (no select)');
    
    // Test 2: Try with select
    console.log('\n2️⃣ Testing insert with select...');
    const testData2 = { ...testData, description: 'Test with select' };
    const start2 = Date.now();
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData2)
      .select()
      .single();
    
    const duration2 = Date.now() - start2;
    console.log(`Insert with select took: ${duration2}ms`);
    
    if (error) {
      console.error('❌ Insert with select error:', error);
    } else {
      console.log('✅ Insert with select successful:', data);
      
      // Clean up test data
      if (data?.id) {
        await supabase.from('trend_submissions').delete().eq('id', data.id);
        console.log('🧹 Test data cleaned up');
      }
    }
    
  } catch (err) {
    console.error('🚨 Unexpected error:', err);
  }
  
  console.log('\n📊 Summary:');
  console.log('If insert works but hangs with .select(), it might be a Supabase RLS policy issue');
  console.log('If both hang, it might be a network or Supabase service issue');
}

// Also test just a select query
async function testSelect() {
  console.log('🧪 Testing simple select...');
  const start = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('trend_submissions')
      .select('id')
      .limit(1);
    
    const duration = Date.now() - start;
    console.log(`Select took: ${duration}ms`);
    
    if (error) {
      console.error('❌ Select error:', error);
    } else {
      console.log('✅ Select successful');
    }
  } catch (err) {
    console.error('🚨 Error:', err);
  }
}

console.log('Run these commands:');
console.log('testDirectSubmission() - Test full submission');
console.log('testSelect() - Test just a select query');