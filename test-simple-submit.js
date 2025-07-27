// Simple test for trend submission - Run this in browser console on your submit page

async function testSimpleSubmit() {
  console.log('🧪 Testing simple trend submission...');
  
  // Check if user is logged in
  if (!user?.id) {
    console.error('❌ User not logged in. Please login first.');
    return;
  }
  
  console.log('✅ User logged in:', user.id);
  
  // Simple test data
  const testData = {
    spotter_id: user.id,
    category: 'meme_format',
    description: 'Test trend submission from console',
    evidence: {
      url: 'https://tiktok.com/test',
      platform: 'tiktok',
      title: 'Test Trend'
    },
    virality_prediction: 5,
    status: 'submitted',
    quality_score: 0.5,
    validation_count: 0,
    created_at: new Date().toISOString()
  };
  
  console.log('📝 Submitting test data:', testData);
  
  try {
    // Test database insertion
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      
      // Provide specific error help
      if (error.message.includes('violates row-level security')) {
        console.log('🔧 RLS Error Fix: Run this SQL in Supabase:');
        console.log(`UPDATE public.profiles SET id = '${user.id}' WHERE email = '${user.email}';`);
      } else if (error.message.includes('foreign key')) {
        console.log('🔧 Foreign Key Error: User profile may not exist');
        console.log('Check if user exists in profiles table');
      } else if (error.message.includes('violates check constraint')) {
        console.log('🔧 Check Constraint Error: Some field has invalid value');
      }
      
      return;
    }
    
    console.log('🎉 SUCCESS! Trend submitted:', data);
    console.log('✅ Trend ID:', data.id);
    console.log('✅ Created at:', data.created_at);
    
    // Test fetching the submission back
    const { data: fetchedData, error: fetchError } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('id', data.id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching back:', fetchError);
    } else {
      console.log('✅ Successfully fetched back:', fetchedData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Instructions
console.log('🚀 Run testSimpleSubmit() to test trend submission');
console.log('Make sure you are:');
console.log('1. Logged in');
console.log('2. On the submit page');
console.log('3. Have run the database setup SQL');

// Auto-run if user wants
// testSimpleSubmit();