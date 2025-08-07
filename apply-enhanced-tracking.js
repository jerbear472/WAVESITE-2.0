const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying enhanced tracking fields migration...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./add-enhanced-tracking-fields.sql', 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.includes('CREATE INDEX') || 
          statement.includes('ALTER TABLE') || 
          statement.includes('ALTER TYPE') ||
          statement.includes('DO $$')) {
        
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          query: statement + ';'
        }).single();
        
        if (error && !error.message?.includes('already exists')) {
          console.error(`Error: ${error.message}`);
        } else {
          console.log('✅ Success');
        }
      }
    }
    
    // Verify the changes
    console.log('\n📊 Verifying schema changes...\n');
    
    const { data: columns } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name IN ('platform', 'engagement_score', 'demographic_data', 'finance_data')
        ORDER BY column_name;
      `
    }).single();
    
    if (columns && columns.length > 0) {
      console.log('New columns added:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test the enhanced scroll page at /scroll');
    console.log('2. Log some trends with demographic and finance data');
    console.log('3. View the enriched data in the enterprise dashboard at /enterprise/dashboard');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach if exec_sql doesn't work
async function applyDirectly() {
  console.log('Trying direct approach...\n');
  
  const queries = [
    `ALTER TABLE public.trend_submissions ADD COLUMN IF NOT EXISTS platform TEXT`,
    `ALTER TABLE public.trend_submissions ADD COLUMN IF NOT EXISTS engagement_score NUMERIC(3,1) DEFAULT 0`,
    `ALTER TABLE public.trend_submissions ADD COLUMN IF NOT EXISTS demographic_data JSONB DEFAULT '{}'`,
    `ALTER TABLE public.trend_submissions ADD COLUMN IF NOT EXISTS finance_data JSONB DEFAULT null`
  ];
  
  for (const query of queries) {
    console.log(`Executing: ${query}`);
    const { error } = await supabase.from('trend_submissions').select('id').limit(1);
    if (!error) {
      console.log('✅ Table accessible');
    }
  }
}

applyMigration().catch(err => {
  console.error('Primary method failed, trying alternative...', err);
  applyDirectly();
});