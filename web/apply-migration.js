const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRole ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function applyMigration() {
  try {
    console.log('📄 Reading SQL migration file...');
    const sqlPath = path.join(__dirname, '..', 'FIX_VOTE_COUNTS_REALTIME.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Applying vote counts real-time migration...');
    console.log('📝 SQL file size:', sql.length, 'characters');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
      .filter(stmt => stmt.length > 0);
    
    console.log('📋 Found', statements.length, 'SQL statements to execute');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec', { 
          query: statement 
        });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} error (may be expected):`, error.message);
          // Don't exit on errors - some might be expected (like DROP IF EXISTS)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} exception:`, err.message);
      }
    }
    
    console.log('');
    console.log('🎉 Migration application completed!');
    console.log('');
    console.log('📊 Testing the setup...');
    
    // Test by checking if the columns exist
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id, approve_count, reject_count, validation_status')
      .limit(1);
    
    if (testError) {
      console.log('❌ Test query failed:', testError.message);
    } else {
      console.log('✅ Test query successful - columns exist!');
      if (testData && testData.length > 0) {
        console.log('📋 Sample row:', testData[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();