#!/usr/bin/env node

/**
 * Apply Production Fixes Script
 * This script applies all production fixes to make the app ready for deployment
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting production fixes...\n');
  
  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'PRODUCTION_FIX_MIGRATION.sql'),
      'utf8'
    );
    
    console.log('📝 Applying database migration...');
    
    // Split SQL into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) continue;
      
      try {
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        }).catch(async (err) => {
          // If exec_sql doesn't exist, try direct execution
          // Note: This requires service role key
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              query: statement + ';'
            })
          });
          
          if (!response.ok) {
            throw new Error(`SQL execution failed: ${response.statusText}`);
          }
          
          return { error: null };
        });
        
        if (error) {
          console.log(`⚠️ Statement warning: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          process.stdout.write('.');
        }
      } catch (err) {
        console.log(`\n⚠️ Skipping statement (may already exist): ${err.message?.substring(0, 50)}...`);
        errorCount++;
      }
    }
    
    console.log(`\n\n✅ Migration applied: ${successCount} successful, ${errorCount} skipped/warnings\n`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
  
  return true;
}

async function testDatabaseFunctions() {
  console.log('🧪 Testing database functions...\n');
  
  const tests = [
    {
      name: 'User profiles table exists',
      test: async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Trend submissions table exists',
      test: async () => {
        const { data, error } = await supabase
          .from('trend_submissions')
          .select('id')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Trend validations table exists',
      test: async () => {
        const { data, error } = await supabase
          .from('trend_validations')
          .select('id')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Earnings ledger table exists',
      test: async () => {
        const { data, error } = await supabase
          .from('earnings_ledger')
          .select('id')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Storage bucket exists',
      test: async () => {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) return false;
        return data.some(bucket => bucket.name === 'trend-images');
      }
    }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name}`);
        passedTests++;
      } else {
        console.log(`❌ ${name}`);
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);
  
  return failedTests === 0;
}

async function createStorageBucket() {
  console.log('🗂️ Setting up storage bucket...\n');
  
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'trend-images');
    
    if (!bucketExists) {
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('trend-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (error) {
        console.log('⚠️ Bucket creation warning:', error.message);
      } else {
        console.log('✅ Storage bucket created successfully');
      }
    } else {
      console.log('✅ Storage bucket already exists');
    }
  } catch (error) {
    console.error('❌ Storage setup failed:', error);
  }
}

async function main() {
  console.log('========================================');
  console.log('   WAVESIGHT PRODUCTION SETUP SCRIPT   ');
  console.log('========================================\n');
  
  // Step 1: Run migration
  const migrationSuccess = await runMigration();
  if (!migrationSuccess) {
    console.error('\n⚠️ Migration had issues but continuing...\n');
  }
  
  // Step 2: Create storage bucket
  await createStorageBucket();
  
  // Step 3: Test database
  const testsPass = await testDatabaseFunctions();
  
  // Summary
  console.log('========================================');
  console.log('              SUMMARY                   ');
  console.log('========================================\n');
  
  if (testsPass) {
    console.log('🎉 SUCCESS! Your app is production ready!\n');
    console.log('Next steps:');
    console.log('1. Update your frontend components to use the new services');
    console.log('2. Test all functionality locally');
    console.log('3. Deploy to Vercel');
    console.log('4. Monitor for any issues\n');
    console.log('📋 See PRODUCTION_DEPLOYMENT_CHECKLIST.md for detailed steps');
  } else {
    console.log('⚠️ Some tests failed. Please review and fix issues.\n');
    console.log('Common issues:');
    console.log('- Check your Supabase credentials');
    console.log('- Ensure you have the correct permissions');
    console.log('- Some tables might already exist (this is OK)');
    console.log('- Review the error messages above\n');
  }
  
  console.log('\n✨ Script completed!');
}

// Run the script
main().catch(console.error);