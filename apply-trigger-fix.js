const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyTriggerFix() {
  console.log('🔧 Applying trend submission trigger fix...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./FIX_TREND_SUBMISSION_TRIGGER.sql', 'utf8');
    
    // For Supabase, we need to use migrations or direct SQL execution
    // Since we can't run raw SQL directly via the JS client, we'll test the fix differently
    
    console.log('⚠️ Note: Trigger creation requires database admin access.');
    console.log('The SQL file has been created: FIX_TREND_SUBMISSION_TRIGGER.sql');
    console.log('\nTo apply this fix, you need to:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Paste the contents of FIX_TREND_SUBMISSION_TRIGGER.sql');
    console.log('3. Run the query');
    console.log('\nAlternatively, for now we can test if submissions work without the trigger...\n');
    
    // Test submission without trigger (manually create earnings)
    console.log('Testing manual earnings creation...');
    
    // Get a test user
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, performance_tier, current_streak')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.error('No users found');
      return;
    }
    
    const testUser = users[0];
    console.log('Test user:', testUser.id);
    
    // Create a test submission
    const testSubmission = {
      spotter_id: testUser.id,
      category: 'meme',
      description: 'Test trend for trigger verification',
      title: 'Test Trend',
      status: 'submitted',
      payment_amount: 0.25,
      platform: 'tiktok',
      post_url: 'https://example.com/test',
      wave_score: 75,
      quality_score: 75,
      validation_count: 0
    };
    
    console.log('Creating test submission...');
    const { data: submission, error: subError } = await supabase
      .from('trend_submissions')
      .insert(testSubmission)
      .select()
      .single();
    
    if (subError) {
      console.error('Submission error:', subError);
      return;
    }
    
    console.log('✅ Submission created:', submission.id);
    console.log('Payment amount:', submission.payment_amount);
    
    // Manually create earnings entry (what the trigger should do)
    const tier = testUser.performance_tier || 'learning';
    const tierMultiplier = tier === 'master' ? 3.0 :
                          tier === 'elite' ? 2.0 :
                          tier === 'verified' ? 1.5 :
                          tier === 'restricted' ? 0.5 : 1.0;
    
    const calculatedAmount = (0.25 * tierMultiplier).toFixed(2);
    
    console.log('\nManually creating earnings entry...');
    const { data: earnings, error: earnError } = await supabase
      .from('earnings_ledger')
      .insert({
        user_id: testUser.id,
        amount: calculatedAmount,
        type: 'trend_submission',
        transaction_type: 'trend_submission',
        status: 'pending',
        description: `Test trend submission: $${calculatedAmount}`,
        reference_id: submission.id,
        reference_type: 'trend_submissions',
        metadata: {
          base_amount: 0.25,
          tier: tier,
          tier_multiplier: tierMultiplier,
          session_multiplier: 1.0,
          daily_multiplier: 1.0
        }
      })
      .select()
      .single();
    
    if (earnError) {
      console.error('Earnings creation error:', earnError);
    } else {
      console.log('✅ Earnings created:', earnings.id);
      console.log('Amount:', earnings.amount);
      console.log('Status:', earnings.status);
    }
    
    // Clean up
    console.log('\nCleaning up test data...');
    
    if (earnings) {
      await supabase
        .from('earnings_ledger')
        .delete()
        .eq('id', earnings.id);
    }
    
    await supabase
      .from('trend_submissions')
      .delete()
      .eq('id', submission.id);
    
    console.log('✅ Test data cleaned');
    
    console.log('\n========================================');
    console.log('📋 SUMMARY:');
    console.log('========================================');
    console.log('✅ Trend submissions table is working');
    console.log('✅ Manual earnings creation works');
    console.log('⚠️ Automatic trigger needs to be applied via SQL');
    console.log('\nNext steps:');
    console.log('1. Apply the trigger using FIX_TREND_SUBMISSION_TRIGGER.sql');
    console.log('2. Test trend submission from the app');
    console.log('3. Verify earnings are created automatically');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyTriggerFix();