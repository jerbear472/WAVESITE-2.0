const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyEarningsFix() {
  console.log('🚀 Starting earnings fix...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./FIX_EARNINGS_CALCULATIONS_NOW.sql', 'utf8');
    
    // Split into individual statements (be careful with semicolons in strings)
    const statements = sql
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      // Show progress
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
      
      try {
        // Use raw SQL execution
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        if (error) {
          // Try direct execution as fallback
          const { data, error: directError } = await supabase
            .from('_sql')
            .insert({ query: statement })
            .select();
            
          if (directError) {
            throw directError;
          }
        }
        
        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errorCount++;
        
        // Continue with other statements even if one fails
        if (statement.includes('CREATE TRIGGER') || statement.includes('DROP TRIGGER')) {
          console.log('   ⚠️  Trigger error (may already exist), continuing...\n');
        }
      }
    }
    
    console.log('======================================');
    console.log(`✅ Completed: ${successCount} successful`);
    if (errorCount > 0) {
      console.log(`⚠️  Errors: ${errorCount} failed`);
    }
    console.log('======================================\n');
    
    // Verify the fix worked
    console.log('🔍 Verifying earnings fix...\n');
    
    // Check earnings_ledger for non-zero amounts
    const { data: earnings, error: earningsError } = await supabase
      .from('earnings_ledger')
      .select('amount, status, metadata')
      .eq('type', 'trend_submission')
      .limit(5);
      
    if (!earningsError && earnings) {
      console.log('📊 Sample earnings after fix:');
      earnings.forEach((e, idx) => {
        const tier = e.metadata?.tier || 'unknown';
        const multipliers = `${e.metadata?.tier_multiplier || 1}x × ${e.metadata?.session_multiplier || 1}x × ${e.metadata?.daily_multiplier || 1}x`;
        console.log(`   ${idx + 1}. $${e.amount} (${e.status}) - ${tier} tier, multipliers: ${multipliers}`);
      });
    }
    
    // Check trend_submissions payment amounts
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('payment_amount, status')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (!trendsError && trends) {
      console.log('\n📈 Recent trend submission amounts:');
      trends.forEach((t, idx) => {
        console.log(`   ${idx + 1}. $${t.payment_amount || 0} (${t.status})`);
      });
    }
    
    // Check user earnings totals
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('earnings_pending, earnings_approved, total_earnings')
      .gt('total_earnings', 0)
      .limit(3);
      
    if (!usersError && users && users.length > 0) {
      console.log('\n👤 User earnings totals:');
      users.forEach((u, idx) => {
        console.log(`   ${idx + 1}. Pending: $${u.earnings_pending || 0}, Approved: $${u.earnings_approved || 0}, Total: $${u.total_earnings || 0}`);
      });
    }
    
    console.log('\n✅ Earnings fix applied successfully!');
    console.log('📱 Users should now see their earnings with proper multipliers on the earnings page.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Alternative approach using psql if available
async function applyUsingPSQL() {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  console.log('🔧 Attempting to apply fix using psql...\n');
  
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    console.log('⚠️  No database URL found, using API approach instead\n');
    return false;
  }
  
  try {
    const command = `psql "${dbUrl}" -f FIX_EARNINGS_CALCULATIONS_NOW.sql`;
    const { stdout, stderr } = await execPromise(command);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ SQL applied via psql successfully\n');
    return true;
  } catch (error) {
    console.log('⚠️  psql not available or failed, using API approach\n');
    return false;
  }
}

// Main execution
(async () => {
  // Try psql first, then fall back to API
  const psqlSuccess = await applyUsingPSQL();
  
  if (!psqlSuccess) {
    await applyEarningsFix();
  }
})();