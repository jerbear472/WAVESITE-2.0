import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyCheckRateLimitFix() {
  try {
    console.log('🔧 Applying check_rate_limit fix...\n');

    // Read the SQL file
    const sql = readFileSync(join(__dirname, 'fix-check-rate-limit.sql'), 'utf-8');

    // Split SQL into individual statements
    const statements = sql.split(/;\s*$/m).filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing statement...');
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        }).catch(() => {
          // If exec_sql doesn't exist, try alternative approach
          return { error: 'exec_sql not available' };
        });

        if (error) {
          console.warn('Note: Direct SQL execution not available. Please run the SQL manually in Supabase dashboard.');
          console.log('\nSQL to execute:\n');
          console.log(sql);
          break;
        }
      }
    }

    console.log('\n✅ Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of fix-check-rate-limit.sql');
    console.log('4. Execute the SQL');
    console.log('\n📝 This fix will:');
    console.log('- Improve the check_rate_limit function to handle resets correctly');
    console.log('- Fix the increment_validation_count function');
    console.log('- Ensure counters reset properly at hour/day boundaries');
    console.log('- Make the remaining counts decrease correctly');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyCheckRateLimitFix();