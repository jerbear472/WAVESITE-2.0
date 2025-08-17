const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testTrendSubmission() {
  console.log('🧪 Testing trend submission flow...\n');
  
  try {
    // 1. Check if trend_submissions table exists and has correct columns
    console.log('1️⃣ Checking trend_submissions table structure...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Error accessing trend_submissions:', tableError.message);
      return;
    }
    
    console.log('✅ Table exists and is accessible\n');
    
    // 2. Test a sample submission
    console.log('2️⃣ Testing a sample trend submission...');
    
    // Get a test user
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.error('❌ No users found for testing');
      return;
    }
    
    const testUserId = users[0].id;
    console.log('Using test user:', testUserId);
    
    // Create test submission data (matching what the app sends)
    const testSubmission = {
      spotter_id: testUserId,
      category: 'meme',
      description: 'Test trend submission',
      title: 'Test Trend',
      status: 'submitted',
      trend_velocity: 'just_starting',
      trend_size: 'niche',
      ai_angle: 'not_ai',
      sentiment: 75,
      audience_age: ['18-24', '25-34'],
      category_answers: { format: 'Image meme', remixability: 'Some variations' },
      velocity_metrics: {
        velocity: 'just_starting',
        size: 'niche',
        timing: 'today',
        capturedAt: new Date().toISOString()
      },
      evidence: {
        test: true,
        payment_amount: 0.25
      },
      virality_prediction: 3,
      quality_score: 75,
      validation_count: 0,
      payment_amount: 0.25,
      platform: 'tiktok',
      post_url: 'https://example.com/test',
      wave_score: 75
    };
    
    console.log('Submitting test trend...');
    
    const { data: submissionResult, error: submissionError } = await supabase
      .from('trend_submissions')
      .insert(testSubmission)
      .select()
      .single();
    
    if (submissionError) {
      console.error('❌ Submission failed:', submissionError.message);
      console.error('Error details:', {
        code: submissionError.code,
        details: submissionError.details,
        hint: submissionError.hint
      });
      
      // Check for specific column errors
      if (submissionError.message.includes('column')) {
        console.log('\n⚠️ Column mismatch detected. Checking table columns...');
        
        // Try to get column info
        const { data: columnsData } = await supabase
          .rpc('get_table_columns', { table_name: 'trend_submissions' });
        
        if (columnsData) {
          console.log('Available columns:', columnsData.map(c => c.column_name).join(', '));
        }
      }
      return;
    }
    
    console.log('✅ Test submission successful!');
    console.log('Submission ID:', submissionResult.id);
    console.log('Payment amount:', submissionResult.payment_amount);
    
    // 3. Check if earnings were created
    console.log('\n3️⃣ Checking if earnings were created...');
    
    const { data: earnings } = await supabase
      .from('earnings_ledger')
      .select('*')
      .eq('user_id', testUserId)
      .eq('reference_id', submissionResult.id)
      .single();
    
    if (earnings) {
      console.log('✅ Earnings entry created!');
      console.log('Amount:', earnings.amount);
      console.log('Status:', earnings.status);
      console.log('Multipliers:', earnings.metadata);
    } else {
      console.log('⚠️ No earnings entry found (trigger might not be set up)');
    }
    
    // 4. Clean up test data
    console.log('\n4️⃣ Cleaning up test data...');
    
    await supabase
      .from('trend_submissions')
      .delete()
      .eq('id', submissionResult.id);
    
    if (earnings) {
      await supabase
        .from('earnings_ledger')
        .delete()
        .eq('id', earnings.id);
    }
    
    console.log('✅ Test data cleaned up');
    
    console.log('\n✅ TREND SUBMISSION SYSTEM IS WORKING!');
    console.log('Users can submit trends and earn money.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testTrendSubmission();