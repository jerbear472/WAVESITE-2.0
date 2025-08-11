const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.log('\nTo run this script:');
  console.log('1. Get your service key from: https://app.supabase.com/project/aicahushpcslwjwrlqbo/settings/api');
  console.log('2. Run: SUPABASE_SERVICE_KEY="your-service-key" node scripts/setup-database.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Setting up captured_trends table...');
    
    // Create the table using Supabase's SQL editor
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create captured_trends table
        CREATE TABLE IF NOT EXISTS captured_trends (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          platform TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          hashtags TEXT,
          metadata JSONB DEFAULT '{}',
          captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_trending BOOLEAN DEFAULT FALSE,
          engagement_score INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_captured_trends_user_id ON captured_trends(user_id);
        CREATE INDEX IF NOT EXISTS idx_captured_trends_platform ON captured_trends(platform);
        CREATE INDEX IF NOT EXISTS idx_captured_trends_captured_at ON captured_trends(captured_at DESC);
        CREATE INDEX IF NOT EXISTS idx_captured_trends_is_trending ON captured_trends(is_trending);

        -- Create unique constraint to prevent duplicate captures
        CREATE UNIQUE INDEX IF NOT EXISTS idx_captured_trends_user_url ON captured_trends(user_id, url);

        -- Enable Row Level Security
        ALTER TABLE captured_trends ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view their own captured trends"
          ON captured_trends FOR SELECT
          USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own captured trends"
          ON captured_trends FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own captured trends"
          ON captured_trends FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own captured trends"
          ON captured_trends FOR DELETE
          USING (auth.uid() = user_id);
      `
    });

    if (error) {
      console.error('Error creating table:', error);
      return;
    }

    console.log('✅ Table created successfully!');
    
    // Test the table
    const { data, error: testError } = await supabase
      .from('captured_trends')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('Error testing table:', testError);
    } else {
      console.log('✅ Table is accessible and working!');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupDatabase();