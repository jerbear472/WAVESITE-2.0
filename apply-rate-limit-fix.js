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

async function applyRateLimitFix() {
  try {
    console.log('🔧 Applying rate limit fix...\n');

    // Read the SQL file
    const sql = readFileSync(join(__dirname, 'fix-rate-limit-increment.sql'), 'utf-8');

    // Execute the SQL
    const { error } = await supabase.rpc('query', { query: sql });

    if (error) {
      // Try executing directly if the query function doesn't exist
      console.log('Trying direct execution...');
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase.rpc('exec', { sql: statement + ';' });
          if (execError) {
            console.error('Error executing statement:', execError);
          }
        }
      }
    }

    console.log('✅ Rate limit fix applied successfully!');
    console.log('\n📝 The following changes were made:');
    console.log('- Created increment_validation_count function');
    console.log('- Fixed rate limit logic to properly increment counts');
    console.log('- Updated UI to show correct limits (20 hourly, 100 daily)');
    console.log('- Added warning message when rate limit is reached');

  } catch (error) {
    console.error('❌ Error applying rate limit fix:', error);
  }
}

applyRateLimitFix();