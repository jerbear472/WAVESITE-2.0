const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPaymentAmountColumn() {
  console.log('🔧 Fixing payment_amount column issue...\n');

  try {
    // Read the SQL fix
    const sqlPath = path.join(__dirname, 'QUICK_FIX_PAYMENT_AMOUNT.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing SQL to add payment_amount column...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    }).catch(async (err) => {
      // If exec_sql doesn't exist, try direct execution
      console.log('ℹ️ exec_sql function not found, trying alternative method...');
      
      // Try to execute via raw SQL (this might not work depending on Supabase setup)
      const { data: execData, error: execError } = await supabase
        .from('trend_submissions')
        .select('payment_amount')
        .limit(1);
      
      if (execError && execError.message.includes('column')) {
        // Column doesn't exist, let's add it
        console.log('⚠️ Column doesn\'t exist. Please run the following SQL in Supabase Dashboard:');
        console.log('\n' + '='.repeat(60));
        console.log(sql);
        console.log('='.repeat(60) + '\n');
        return { manual: true };
      }
      
      return { exists: true };
    });

    if (data?.manual) {
      console.log('📋 Please copy and run the SQL above in your Supabase SQL Editor');
      console.log('   Go to: https://app.supabase.com/project/aicahushpcslwjwrlqbo/sql/new');
      return;
    }

    if (data?.exists) {
      console.log('✅ payment_amount column already exists!');
      return;
    }

    if (error) {
      console.error('❌ Error executing SQL:', error);
      console.log('\n📋 Please run this SQL manually in Supabase Dashboard:');
      console.log('   Go to: https://app.supabase.com/project/aicahushpcslwjwrlqbo/sql/new');
      console.log('\n' + '='.repeat(60));
      console.log(sql);
      console.log('='.repeat(60) + '\n');
      return;
    }

    console.log('✅ Successfully added payment_amount column!');
    
    // Verify the column exists
    console.log('\n🔍 Verifying column exists...');
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id, payment_amount')
      .limit(1);
    
    if (testError) {
      console.error('⚠️ Warning: Could not verify column:', testError.message);
    } else {
      console.log('✅ Verified! payment_amount column is accessible');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.log('\n📋 Please run the QUICK_FIX_PAYMENT_AMOUNT.sql manually in Supabase Dashboard');
    console.log('   Go to: https://app.supabase.com/project/aicahushpcslwjwrlqbo/sql/new');
  }
}

// Run the fix
fixPaymentAmountColumn()
  .then(() => {
    console.log('\n✨ Fix process completed!');
    console.log('🎯 You can now try submitting trends again.');
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });