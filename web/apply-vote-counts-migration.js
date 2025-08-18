const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    console.log('🔄 Reading SQL migration file...');
    const sql = fs.readFileSync('../FIX_VOTE_COUNTS_REALTIME.sql', 'utf8');
    
    console.log('🚀 Applying vote counts real-time migration...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('📊 Result:', data);
    
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
  }
}

applyMigration();