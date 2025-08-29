const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyValidationFix() {
  console.log('🔧 Applying validation system fix...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('../FIX_VALIDATION_SYSTEM.sql', 'utf8');
    
    // Split by semicolons and filter out empty statements
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip pure comment lines
      if (statement.trim().startsWith('--')) continue;
      
      // Extract first line for logging
      const firstLine = statement.split('\n')[0].substring(0, 80);
      console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase.from('_sql').select(statement);
          
          if (directError) {
            console.error(`   ❌ Error: ${directError.message}`);
            errorCount++;
          } else {
            console.log('   ✅ Success');
            successCount++;
          }
        } else {
          console.log('   ✅ Success');
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Migration completed: ${successCount} successful, ${errorCount} errors`);
    
    // Verify the fix worked
    console.log('\n🔍 Verifying validation system...\n');
    
    // Check if columns exist
    const { data: columns, error: colError } = await supabase
      .from('trend_submissions')
      .select('validation_wave_votes, validation_fire_votes, validation_dead_votes')
      .limit(1);
      
    if (!colError) {
      console.log('✅ Validation vote columns exist');
    } else {
      console.log('❌ Validation vote columns missing:', colError.message);
    }
    
    // Check current status distribution
    const { data: statusCounts, error: statusError } = await supabase
      .from('trend_submissions')
      .select('status');
      
    if (!statusError && statusCounts) {
      const counts = {};
      statusCounts.forEach(row => {
        counts[row.status] = (counts[row.status] || 0) + 1;
      });
      
      console.log('\n📊 Current trend status distribution:');
      Object.entries(counts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} trends`);
      });
    }
    
    console.log('\n✨ Validation system fix complete!');
    console.log('Users can now vote on the validation page and trends will automatically');
    console.log('move to "validated" status after 3 wave/fire votes or "rejected" after 3 dead votes.');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
  
  process.exit(0);
}

// Note: Direct SQL execution via Supabase client is limited
// You may need to run the SQL directly in Supabase dashboard
console.log('⚠️  Note: For best results, run the SQL migration directly in Supabase dashboard');
console.log('    Go to: SQL Editor in your Supabase project');
console.log('    Copy contents of: FIX_VALIDATION_SYSTEM.sql');
console.log('    Paste and run in SQL Editor\n');

console.log('Attempting automatic application (may have limitations)...\n');

applyValidationFix();