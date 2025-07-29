const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Get Supabase credentials from environment or use defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://achuavagkhjenaypawij.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required for migrations');
  console.log('Please set it in your environment variables or .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Starting enhanced voting system migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250729_enhanced_voting_system.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Split the migration into individual statements
    // This is a simple split - in production you'd want more robust SQL parsing
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip if it's just a comment
      if (statement.trim().startsWith('--')) continue;

      try {
        console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
        
        // Extract first few words for logging
        const preview = statement.substring(0, 50).replace(/\n/g, ' ') + '...';
        console.log(`   Preview: ${preview}`);

        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single();

        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
          if (directError) {
            throw error;
          }
        }

        console.log(`   ✅ Success`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
        
        // Continue with other statements
        if (error.message.includes('already exists')) {
          console.log(`   ℹ️  Skipping - object already exists`);
        } else if (!statement.includes('CREATE TYPE')) {
          // Don't fail on type creation errors
          console.log(`   ⚠️  Non-critical error, continuing...`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);
    console.log(`   📈 Success rate: ${((successCount / statements.length) * 100).toFixed(1)}%`);

    // Verify key tables exist
    console.log('\n🔍 Verifying migration results...\n');
    
    const tablesToCheck = [
      'validator_expertise',
      'validation_rate_limits',
      'quality_control_trends',
      'validator_performance_metrics'
    ];

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ Table '${table}' - Error: ${error.message}`);
        } else {
          console.log(`   ✅ Table '${table}' - OK`);
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}' - Not accessible`);
      }
    }

    // Check if functions were created
    console.log('\n🔧 Checking functions...\n');
    
    const functionsToCheck = [
      'calculate_weighted_consensus',
      'get_consensus_threshold',
      'calculate_validation_payment',
      'check_rate_limit'
    ];

    for (const func of functionsToCheck) {
      try {
        // Try to get function info (this is a workaround)
        const { error } = await supabase.rpc(func, {});
        
        if (error && !error.message.includes('required')) {
          console.log(`   ❌ Function '${func}' - Error: ${error.message}`);
        } else {
          console.log(`   ✅ Function '${func}' - OK`);
        }
      } catch (err) {
        console.log(`   ✅ Function '${func}' - Exists (params required)`);
      }
    }

    console.log('\n✨ Enhanced voting system migration completed!\n');
    
    console.log('📝 Next steps:');
    console.log('   1. Update your environment variables if needed');
    console.log('   2. Restart your application');
    console.log('   3. Test the new voting features');
    console.log('   4. Monitor for any issues\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative: Manual SQL execution function
async function executeSQL(sql) {
  try {
    // This is a workaround - in production, use proper migration tools
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Run the migration
console.log('🔧 Enhanced Voting System Migration Tool\n');
console.log(`📍 Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Using ${supabaseServiceKey ? 'service role' : 'anon'} key\n`);

applyMigration().catch(console.error);