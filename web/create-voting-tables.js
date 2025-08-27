// Script to create voting system tables and functions
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function createVotingSystem() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Creating voting system...');

  try {
    // Step 1: Create trend_votes table
    console.log('\n1. Creating trend_votes table...');
    const { error: createTableError } = await supabase.from('trend_votes').select('id').limit(1);
    if (createTableError && createTableError.code === 'PGRST205') {
      console.log('Table does not exist, need to create it manually via SQL...');
    }

    // Step 2: Add columns to trend_submissions  
    console.log('\n2. Adding vote columns to trend_submissions...');
    const { data: columns, error: columnsError } = await supabase
      .from('trend_submissions')
      .select('heat_score')
      .limit(1);
    
    if (columnsError && columnsError.code === '42703') {
      console.log('Vote columns do not exist in trend_submissions');
    } else {
      console.log('Vote columns already exist');
    }

    // Since we can't execute arbitrary DDL through the client, let's try a different approach
    console.log('\n3. The migration needs to be run through Supabase Dashboard SQL Editor');
    console.log('Please copy and paste the following SQL into your Supabase SQL Editor:');
    console.log('');
    console.log('-- Create trend_votes table');
    console.log(`CREATE TABLE IF NOT EXISTS trend_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type VARCHAR(20) CHECK (vote_type IN ('wave', 'fire', 'declining', 'dead')),
  vote_value INTEGER CHECK (vote_value IN (-2, -1, 1, 2)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trend_id, user_id)
);`);

    console.log('');
    console.log('-- Add vote tracking columns to trend_submissions');
    console.log(`ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS heat_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wave_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fire_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS declining_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dead_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0;`);

    console.log('');
    console.log('Then run the full migration file: supabase/migrations/20240328_create_voting_system.sql');

  } catch (err) {
    console.error('Error:', err);
  }
}

createVotingSystem();