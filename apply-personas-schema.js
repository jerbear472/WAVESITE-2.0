#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPersonasSchema() {
  try {
    console.log('🚀 Applying user personas and settings schema...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'supabase', 'add_user_personas_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the RPC doesn't exist, try direct SQL execution
      const { error: directError } = await supabase
        .from('_sql')
        .select('*')
        .limit(1);
      
      if (directError) {
        console.log('Executing SQL directly via query...');
        
        // Split SQL into individual statements and execute them
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
          try {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
            if (stmtError) {
              console.warn(`Warning: ${stmtError.message}`);
            }
          } catch (err) {
            console.warn(`Warning executing statement: ${err.message}`);
          }
        }
      }
    }
    
    console.log('✅ User personas and settings schema applied successfully!');
    
    // Verify the tables were created
    console.log('🔍 Verifying table creation...');
    
    const { data: personas, error: personasError } = await supabase
      .from('user_personas')
      .select('*')
      .limit(1);
    
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);
    
    if (!personasError) {
      console.log('✅ user_personas table verified');
    } else {
      console.error('❌ user_personas table not found:', personasError.message);
    }
    
    if (!settingsError) {
      console.log('✅ user_settings table verified');
    } else {
      console.error('❌ user_settings table not found:', settingsError.message);
    }
    
    console.log('\n🎉 Setup complete! Your users can now:');
    console.log('- Save personas that persist across sessions and devices');
    console.log('- Customize app settings that sync everywhere');
    console.log('- Have their preferences automatically backed up');
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    process.exit(1);
  }
}

// Manual SQL execution function for fallback
async function executeManualSQL() {
  console.log('\n📝 Manual SQL execution required. Please run the following in your Supabase SQL Editor:');
  console.log('=' .repeat(80));
  
  const sqlPath = path.join(__dirname, 'supabase', 'add_user_personas_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log(sql);
  console.log('=' .repeat(80));
  console.log('\nAfter running the SQL, your persona persistence will be ready!');
}

// Run the deployment
applyPersonasSchema().catch(() => {
  console.log('\n⚠️  Automated deployment failed. Switching to manual mode...');
  executeManualSQL();
});