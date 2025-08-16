const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('🔧 Applying payment_amount column fix...\n');

  try {
    // First, test if the column exists by trying to select it
    console.log('1️⃣ Checking if payment_amount column exists...');
    
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id, spotter_id, status, payment_amount')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('payment_amount')) {
        console.log('❌ payment_amount column does not exist');
        console.log('\n📋 MANUAL FIX REQUIRED:');
        console.log('='.repeat(70));
        console.log('Please go to your Supabase Dashboard SQL Editor:');
        console.log('https://app.supabase.com/project/aicahushpcslwjwrlqbo/sql/new');
        console.log('\nAnd run this SQL:\n');
        
        const sql = `
-- Add payment_amount column to trend_submissions
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0.00;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
AND column_name = 'payment_amount';`;
        
        console.log(sql);
        console.log('\n' + '='.repeat(70));
        console.log('\n✅ After running the SQL, try submitting trends again.');
      } else {
        console.error('Different error:', testError.message);
      }
    } else {
      console.log('✅ payment_amount column already exists!');
      console.log('   Found', testData?.length || 0, 'test records');
      
      // Show current columns
      if (testData && testData.length > 0) {
        console.log('\n📊 Sample record columns:');
        console.log('   ', Object.keys(testData[0]).join(', '));
      }
    }
    
    // Also check earnings column
    console.log('\n2️⃣ Checking if earnings column exists...');
    const { data: earningsTest, error: earningsError } = await supabase
      .from('trend_submissions')
      .select('id, earnings')
      .limit(1);
    
    if (earningsError) {
      if (earningsError.message.includes('earnings')) {
        console.log('⚠️ earnings column also missing - run APPLY_EARNINGS_FIX.sql');
      }
    } else {
      console.log('✅ earnings column exists');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

// Run the check
applyFix()
  .then(() => {
    console.log('\n✨ Check completed!');
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });