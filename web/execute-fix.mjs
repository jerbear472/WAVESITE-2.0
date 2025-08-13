import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  console.log('ℹ️  You need to add your service role key to .env.local');
  console.log('ℹ️  You can find it in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLFix() {
  console.log('🔧 Executing SQL fix for cast_trend_vote function...\n');
  
  // Read the SQL file
  const sqlContent = readFileSync('fix-validation-user-id-v2.sql', 'utf8');
  
  // Split into individual statements (roughly - Supabase handles this better)
  const statements = sqlContent.split(/;[\r\n]+/).filter(s => s.trim());
  
  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
  
  // Note: Supabase doesn't expose raw SQL execution through the JS client
  // We need to use the Dashboard or CLI for this
  
  console.log('⚠️  The Supabase JS client doesn\'t support raw SQL execution.');
  console.log('\n📋 Please copy and run the following SQL in your Supabase Dashboard:\n');
  console.log('1. Go to: ' + supabaseUrl.replace('/rest/v1', '') + '/sql');
  console.log('2. Click "SQL Editor" in the left sidebar');
  console.log('3. Click "New Query"');
  console.log('4. Paste the contents of fix-validation-user-id-v2.sql');
  console.log('5. Click "Run"\n');
  
  console.log('Or use the Supabase CLI:');
  console.log('npx supabase login');
  console.log('npx supabase link --project-ref [your-project-ref]');
  console.log('npx supabase db push < fix-validation-user-id-v2.sql\n');
}

executeSQLFix();