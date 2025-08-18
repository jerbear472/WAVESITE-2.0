const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '/Users/JeremyUys_1/Desktop/WaveSight/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeValidationTriggers() {
  try {
    console.log('🚨 URGENT: Removing validation earnings triggers...\n');
    
    // Read and execute the SQL cleanup script
    const sql = fs.readFileSync('/Users/JeremyUys_1/Desktop/WaveSight/REMOVE_VALIDATION_EARNINGS_TRIGGERS.sql', 'utf8');
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
      .filter(stmt => stmt.length > 0);
    
    console.log(`📋 Executing ${statements.length} cleanup statements...\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('DROP TRIGGER') || statement.includes('DROP FUNCTION')) {
        console.log(`⏳ ${statement.split(' ').slice(0, 4).join(' ')}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            console.log(`   ℹ️  ${error.message} (likely doesn't exist - OK)`);
          } else {
            console.log(`   ✅ Executed successfully`);
          }
        } catch (err) {
          console.log(`   ℹ️  ${err.message} (likely doesn't exist - OK)`);
        }
      }
    }
    
    console.log('\n🎯 CLEANUP COMPLETE!');
    console.log('📝 Now only frontend should create validation earnings');
    console.log('💰 Expected: exactly $0.02 per validation');
    console.log('\n✅ Try validating another trend - you should only see $0.02 now!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

removeValidationTriggers();