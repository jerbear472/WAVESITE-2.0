#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration - NEW instance
const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg4NzU1NCwiZXhwIjoyMDcwNDYzNTU0fQ.0VJxNsrW0NDUXyRGbjEqmSu6ugf3J78khKoRpIIMK6w';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSchema() {
  console.log('🚀 Setting up complete schema for new Supabase instance...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../supabase/COMPLETE_SCHEMA.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements (simple split by semicolon)
    const statements = sql
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      // Log progress for major operations
      if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\S+)/i)?.[1];
        console.log(`\n📊 Creating table: ${tableName}`);
      } else if (statement.includes('CREATE TYPE')) {
        const typeName = statement.match(/CREATE TYPE (\S+)/i)?.[1];
        console.log(`\n🏷️ Creating type: ${typeName}`);
      } else if (statement.includes('CREATE FUNCTION')) {
        const funcName = statement.match(/CREATE (?:OR REPLACE )?FUNCTION (\S+)/i)?.[1];
        console.log(`\n⚙️ Creating function: ${funcName}`);
      } else if (statement.includes('CREATE POLICY')) {
        const policyName = statement.match(/CREATE POLICY "([^"]+)"/i)?.[1];
        console.log(`\n🔒 Creating policy: ${policyName}`);
      } else if (statement.includes('CREATE TRIGGER')) {
        const triggerName = statement.match(/CREATE TRIGGER (\S+)/i)?.[1];
        console.log(`\n⚡ Creating trigger: ${triggerName}`);
      }
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).catch(async (rpcError) => {
          // If RPC doesn't exist, try direct query (won't work for DDL but worth trying)
          console.log('⚠️ exec_sql RPC not available, statement may need manual execution');
          return { error: rpcError };
        });
        
        if (error) {
          // Check if it's an "already exists" error
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate')) {
            skipCount++;
            console.log(`⏭️ Skipped (already exists)`);
          } else {
            errorCount++;
            console.error(`❌ Error: ${error.message}`);
            // Continue with next statement instead of failing completely
          }
        } else {
          successCount++;
          console.log(`✅ Success`);
        }
      } catch (err) {
        errorCount++;
        console.error(`❌ Error executing statement ${i + 1}: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SCHEMA SETUP SUMMARY:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️ Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some statements failed. This might be expected if:');
      console.log('- Tables/types already exist');
      console.log('- You need to run the SQL directly in Supabase SQL Editor');
      console.log('\nSQL file location: supabase/COMPLETE_SCHEMA.sql');
    } else {
      console.log('\n✨ Schema setup completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the schema setup
runSchema();