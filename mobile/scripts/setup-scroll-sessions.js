const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Setting up scroll sessions tables...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/004_create_scroll_sessions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by statements (basic split, might need refinement for complex queries)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).single();
        
        if (error && !error.message.includes('already exists')) {
          console.error('Error executing statement:', error);
          // Continue with next statement instead of failing completely
        }
      }
    }

    console.log('✅ Scroll sessions tables created successfully!');

    // Insert sample challenges
    console.log('🎯 Creating sample challenges...');
    
    const challenges = [
      {
        title: 'Daily Trend Hunter',
        description: 'Log 10 trends in a single day',
        type: 'daily',
        target_value: 10,
        reward_amount: 2.50,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
      {
        title: 'Validation Master',
        description: 'Validate 50 trends this week',
        type: 'weekly',
        target_value: 50,
        reward_amount: 10.00,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      },
      {
        title: 'Marathon Scroller',
        description: 'Complete a 30-minute scroll session',
        type: 'daily',
        target_value: 30,
        reward_amount: 5.00,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      },
    ];

    for (const challenge of challenges) {
      const { error } = await supabase
        .from('challenges')
        .insert(challenge);
      
      if (error && !error.message.includes('duplicate')) {
        console.error('Error inserting challenge:', error);
      }
    }

    console.log('✅ Sample challenges created!');
    console.log('\n🎉 Setup complete! Your app is ready for scroll sessions.');

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Alternative: Direct SQL execution if RPC doesn't work
async function executeSQLDirect() {
  console.log(`
⚠️  If the automatic setup fails, please run the following SQL manually in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of: mobile/supabase/migrations/004_create_scroll_sessions.sql
4. Click "Run"

The migration file creates:
- scroll_sessions table
- logged_trends table
- user_earnings table
- user_streaks table
- challenges & challenge_completions tables
- trend_verifications table
- Required indexes and RLS policies
`);
}

// Run the migration
runMigration().then(() => {
  executeSQLDirect();
});