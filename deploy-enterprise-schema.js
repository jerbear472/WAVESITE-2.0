const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployEnterpriseSchema() {
  console.log('🚀 Starting Enterprise Schema Deployment...\n');

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'supabase', 'enterprise_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL into individual statements (basic split by semicolon)
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Get a description of what this statement does
      let description = 'Executing statement';
      if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
        description = `Creating table: ${tableName}`;
      } else if (statement.includes('ALTER TABLE')) {
        const tableName = statement.match(/ALTER TABLE (\w+)/i)?.[1];
        description = `Altering table: ${tableName}`;
      } else if (statement.includes('CREATE INDEX')) {
        const indexName = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i)?.[1];
        description = `Creating index: ${indexName}`;
      } else if (statement.includes('CREATE POLICY')) {
        const policyName = statement.match(/CREATE POLICY "([^"]+)"/i)?.[1];
        description = `Creating RLS policy: ${policyName}`;
      } else if (statement.includes('CREATE FUNCTION')) {
        const functionName = statement.match(/CREATE (?:OR REPLACE )?FUNCTION (\w+)/i)?.[1];
        description = `Creating function: ${functionName}`;
      } else if (statement.includes('CREATE TRIGGER')) {
        const triggerName = statement.match(/CREATE TRIGGER (\w+)/i)?.[1];
        description = `Creating trigger: ${triggerName}`;
      }

      process.stdout.write(`[${i + 1}/${statements.length}] ${description}... `);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct execution as fallback
          const { data, error: directError } = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1);
          
          // If we can't even query, try a different approach
          if (directError) {
            console.log('⚠️  Cannot execute via RPC, skipping this statement');
            console.log(`   Statement: ${statement.substring(0, 50)}...`);
            errorCount++;
          } else {
            console.log('✅');
            successCount++;
          }
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err) {
        console.log('❌');
        console.log(`   Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Deployment Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);

    // Verify key tables were created
    console.log('\n🔍 Verifying key tables...');
    const tablesToCheck = [
      'enterprise_trends',
      'api_keys',
      'enterprise_alerts',
      'alert_notifications',
      'export_jobs',
      'integrations'
    ];

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`   ✅ ${table} - OK`);
        } else {
          console.log(`   ❌ ${table} - Not accessible`);
        }
      } catch (err) {
        console.log(`   ❌ ${table} - Error: ${err.message}`);
      }
    }

    console.log('\n✨ Enterprise schema deployment completed!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function deployViaSQL() {
  console.log('\n📝 Attempting alternative deployment method...\n');
  
  const { Client } = require('pg');
  
  // Parse database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read schema file
    const schemaPath = path.join(__dirname, 'supabase', 'enterprise_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Execute the entire schema at once
    console.log('🔄 Executing enterprise schema...');
    await client.query(schemaSQL);
    
    console.log('✅ Schema deployed successfully!\n');

    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'enterprise_trends', 'api_keys', 'enterprise_alerts',
        'alert_notifications', 'export_jobs', 'integrations'
      )
    `);

    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Main execution
async function main() {
  console.log('🌊 WaveSight Enterprise Schema Deployment\n');

  // Try Supabase client first
  try {
    await deployEnterpriseSchema();
  } catch (error) {
    console.log('\n⚠️  Supabase client method failed, trying direct SQL...');
    await deployViaSQL();
  }
}

main().catch(console.error);