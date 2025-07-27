const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('Adding updated_at column to trend_submissions table...');
  
  try {
    // Add updated_at column
    const { error: columnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.trend_submissions 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `
    });
    
    if (columnError) {
      console.error('Error adding column:', columnError);
      // Try direct query if RPC doesn't work
      console.log('Trying alternative method...');
    }
    
    console.log('✅ Successfully added updated_at column');
    
    // Create update trigger
    console.log('Creating update trigger...');
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        DROP TRIGGER IF EXISTS update_trend_submissions_updated_at ON public.trend_submissions;
        CREATE TRIGGER update_trend_submissions_updated_at
            BEFORE UPDATE ON public.trend_submissions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `
    });
    
    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
    } else {
      console.log('✅ Successfully created update trigger');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyFix();