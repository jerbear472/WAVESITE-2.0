// Production Debugging Script for Vercel Deployment
// Run this in browser console on your Vercel deployment

async function debugTrendSubmission() {
  console.log('🔍 WAVESIGHT PRODUCTION DEBUG');
  console.log('==============================');
  
  // 1. Check Supabase connection
  console.log('\n1️⃣ Checking Supabase connection...');
  if (typeof supabase !== 'undefined') {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        console.log('✅ Supabase connected, user authenticated:', user.email);
      } else {
        console.error('❌ No authenticated user');
      }
    } catch (e) {
      console.error('❌ Supabase error:', e);
    }
  } else {
    console.error('❌ Supabase client not found');
  }
  
  // 2. Check environment variables
  console.log('\n2️⃣ Checking environment variables...');
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
  console.log('API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');
  
  // 3. Test proxy API
  console.log('\n3️⃣ Testing proxy API...');
  const testUrl = 'https://httpbin.org/json';
  try {
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(testUrl)}`);
    if (response.ok) {
      console.log('✅ Proxy API working');
      const data = await response.json();
      console.log('Sample response:', data);
    } else {
      console.error('❌ Proxy API failed:', response.status);
      const error = await response.text();
      console.error('Error:', error);
    }
  } catch (e) {
    console.error('❌ Proxy API error:', e);
  }
  
  // 4. Test metadata extraction
  console.log('\n4️⃣ Testing metadata extraction...');
  if (typeof MetadataExtractor !== 'undefined') {
    try {
      const testTikTok = 'https://www.tiktok.com/@khaby.lame/video/7137423965982686469';
      console.log('Testing with URL:', testTikTok);
      const metadata = await MetadataExtractor.extractFromUrl(testTikTok);
      console.log('✅ Metadata extracted:', metadata);
    } catch (e) {
      console.error('❌ Metadata extraction error:', e);
    }
  } else {
    console.error('❌ MetadataExtractor not found');
  }
  
  // 5. Check database permissions
  console.log('\n5️⃣ Checking database permissions...');
  if (typeof supabase !== 'undefined') {
    try {
      // Try to query profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .single();
        
      if (profile) {
        console.log('✅ Can read profiles table');
      } else if (profileError) {
        console.error('❌ Profile read error:', profileError);
      }
      
      // Try to query trend_submissions
      const { data: trends, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('id')
        .limit(1);
        
      if (trendsError) {
        console.error('❌ trend_submissions table error:', trendsError);
        if (trendsError.message.includes('relation') && trendsError.message.includes('does not exist')) {
          console.error('⚠️  Table does not exist! Run the SQL fix script in Supabase');
        }
      } else {
        console.log('✅ Can read trend_submissions table');
      }
    } catch (e) {
      console.error('❌ Database check error:', e);
    }
  }
  
  console.log('\n📊 DEBUG SUMMARY');
  console.log('================');
  console.log('If you see errors above, check:');
  console.log('1. Vercel environment variables are set');
  console.log('2. Supabase database has trend_submissions table');
  console.log('3. RLS policies are configured');
  console.log('4. User exists in profiles table');
}

// Run the debug
debugTrendSubmission();

// Test submission with minimal data
async function testMinimalSubmission() {
  console.log('\n🧪 Testing minimal submission...');
  
  if (typeof supabase === 'undefined' || !user?.id) {
    console.error('❌ Cannot test: Supabase or user not available');
    return;
  }
  
  const testData = {
    spotter_id: user.id,
    category: 'test',
    description: 'Test submission from production debug',
    evidence: { test: true },
    virality_prediction: 5,
    status: 'submitted',
    quality_score: 0.5,
    validation_count: 0
  };
  
  console.log('Submitting test data:', testData);
  
  const { data, error } = await supabase
    .from('trend_submissions')
    .insert(testData)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Submission failed:', error);
    console.log('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  } else {
    console.log('✅ Test submission successful!', data);
    // Clean up
    await supabase.from('trend_submissions').delete().eq('id', data.id);
    console.log('🧹 Test data cleaned up');
  }
}

console.log('\nTo test minimal submission, run: testMinimalSubmission()');