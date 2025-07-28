// Debug script to test trend submission issue
// Run this in the browser console while on the submit page

// Check if Supabase is properly initialized
console.log('🔍 Checking Supabase client...');
if (window.supabase) {
  console.log('✅ Supabase client found');
} else {
  console.log('❌ Supabase client not found in window');
}

// Check authentication
async function checkAuth() {
  console.log('\n🔐 Checking authentication...');
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('❌ Auth error:', error);
    return null;
  }
  
  if (user) {
    console.log('✅ User authenticated:', user.email);
    console.log('User ID:', user.id);
    return user;
  } else {
    console.log('❌ No user logged in');
    return null;
  }
}

// Test minimal database insertion
async function testMinimalInsert(userId) {
  console.log('\n🧪 Testing minimal database insert...');
  
  const testData = {
    spotter_id: userId,
    category: 'meme_format',
    description: 'Test submission from debug script',
    evidence: { url: 'https://example.com', title: 'Test' },
    virality_prediction: 5,
    status: 'pending',
    quality_score: 0.5,
    validation_count: 0
  };
  
  console.log('Inserting data:', testData);
  
  try {
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Check specific error types
      if (error.message?.includes('violates row-level security')) {
        console.log('🔧 This is an RLS (Row Level Security) issue');
        console.log('Fix: Check RLS policies for trend_submissions table');
      } else if (error.message?.includes('permission denied')) {
        console.log('🔧 This is a permissions issue');
        console.log('Fix: Check database permissions');
      } else if (error.message?.includes('violates foreign key constraint')) {
        console.log('🔧 This is a foreign key issue');
        console.log('Fix: User profile may not exist');
      }
      
      return null;
    }
    
    console.log('✅ Insert successful!', data);
    
    // Clean up test data
    if (data?.id) {
      await supabase.from('trend_submissions').delete().eq('id', data.id);
      console.log('🧹 Test data cleaned up');
    }
    
    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return null;
  }
}

// Check RLS policies
async function checkRLSPolicies() {
  console.log('\n🔒 Checking RLS policies...');
  
  // Try to read from the table
  const { data: readTest, error: readError } = await supabase
    .from('trend_submissions')
    .select('id')
    .limit(1);
  
  if (readError) {
    console.error('❌ Cannot read from trend_submissions:', readError.message);
  } else {
    console.log('✅ Can read from trend_submissions');
  }
}

// Main debug function
async function debugSubmission() {
  console.log('🚀 Starting submission debug...\n');
  
  // Check auth
  const user = await checkAuth();
  if (!user) {
    console.log('⚠️  Cannot proceed without authentication');
    return;
  }
  
  // Check RLS
  await checkRLSPolicies();
  
  // Test insert
  await testMinimalInsert(user.id);
  
  console.log('\n📋 Debug Summary:');
  console.log('1. Check browser network tab for failed requests');
  console.log('2. Look for CORS errors in console');
  console.log('3. Verify Supabase URL and anon key are correct');
  console.log('4. Check if RLS policies allow inserts for authenticated users');
  
  console.log('\n💡 Quick fixes to try:');
  console.log('1. Log out and log back in');
  console.log('2. Clear browser cache and cookies');
  console.log('3. Try in incognito/private window');
  console.log('4. Check Supabase dashboard for any service issues');
}

// Run the debug
console.log('Run debugSubmission() to start debugging');
console.log('Or run individual functions:');
console.log('- checkAuth()');
console.log('- checkRLSPolicies()');
console.log('- testMinimalInsert(userId)');