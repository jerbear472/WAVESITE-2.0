const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyValidationFixes() {
  console.log('🚀 Starting validation system fixes...\n');

  try {
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'supabase', 'fix_validation_system_complete.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements (simple split by semicolon)
    const statements = sqlContent
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      // Extract a description from the statement
      const firstLine = statement.split('\n')[0];
      const description = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
      
      process.stdout.write(`[${i + 1}/${statements.length}] ${description} ... `);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase.from('_exec').select(statement);
          
          if (directError) {
            throw directError;
          }
        }
        
        console.log('✅');
        successCount++;
      } catch (error) {
        console.log('❌');
        console.error(`   Error: ${error.message}`);
        errorCount++;
        
        // Continue with other statements even if one fails
        continue;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📋 Total: ${statements.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 All validation system fixes applied successfully!');
    } else {
      console.log('\n⚠️  Some statements failed. Please check the errors above.');
    }

    // Update the verify page to use the enhanced version
    console.log('\n📄 Updating verify page to use enhanced version...');
    
    const verifyPagePath = path.join(__dirname, 'web', 'app', '(authenticated)', 'verify', 'page.tsx');
    const enhancedPagePath = path.join(__dirname, 'web', 'app', '(authenticated)', 'verify', 'page.enhanced.tsx');
    
    if (fs.existsSync(enhancedPagePath)) {
      // Backup original
      const backupPath = verifyPagePath + '.backup-' + new Date().toISOString().replace(/:/g, '-');
      fs.copyFileSync(verifyPagePath, backupPath);
      console.log(`   📦 Original backed up to: ${path.basename(backupPath)}`);
      
      // Copy enhanced version
      fs.copyFileSync(enhancedPagePath, verifyPagePath);
      console.log('   ✅ Enhanced verify page activated');
    }

    console.log('\n✨ Validation system upgrade complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the new verify page at /verify');
    console.log('   2. Check the enhanced stats and metrics');
    console.log('   3. Monitor the smart validation thresholds');
    console.log('   4. Review earnings calculations');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Alternative method if direct SQL execution doesn't work
async function executeSQLViaAPI() {
  console.log('\n🔄 Attempting alternative execution method...\n');
  
  try {
    // For Supabase, we might need to use migrations or the Dashboard
    console.log('📝 Instructions for manual execution:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy the contents of supabase/fix_validation_system_complete.sql');
    console.log('   4. Paste and execute in the SQL Editor');
    console.log('   5. Run this script again with --skip-sql flag');
    
    if (process.argv.includes('--skip-sql')) {
      console.log('\n⏭️  Skipping SQL execution...');
      return;
    }
  } catch (error) {
    console.error('❌ Alternative method failed:', error);
  }
}

// Run the fixes
applyValidationFixes().catch(console.error);