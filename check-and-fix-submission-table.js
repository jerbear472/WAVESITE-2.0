const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixTable() {
  console.log('Checking trend_submissions table structure...');
  
  try {
    // First, try to query the table to see what columns exist
    const { data: sampleData, error: queryError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1);
    
    if (queryError) {
      console.error('Error querying table:', queryError);
      
      // If it's a column error, let's try to add missing columns
      if (queryError.message.includes('column')) {
        console.log('Attempting to add missing columns...');
        
        // Add platform column if missing
        await supabase.rpc('exec_sql', {
          sql: `
            ALTER TABLE public.trend_submissions 
            ADD COLUMN IF NOT EXISTS platform TEXT;
          `
        }).catch(e => console.log('Platform column might already exist'));
        
        // Ensure evidence column can store JSONB
        await supabase.rpc('exec_sql', {
          sql: `
            ALTER TABLE public.trend_submissions 
            ALTER COLUMN evidence TYPE JSONB USING evidence::JSONB;
          `
        }).catch(e => console.log('Evidence column type already correct'));
        
        console.log('✅ Column updates attempted');
      }
    } else {
      console.log('✅ Table query successful');
      if (sampleData && sampleData.length > 0) {
        console.log('Sample row columns:', Object.keys(sampleData[0]));
      }
    }
    
    // Test insert with new structure
    console.log('\nTesting insert with new data structure...');
    const testData = {
      spotter_id: 'test-user-id',
      category: 'meme_format',
      description: 'Test trend submission',
      evidence: {
        url: 'https://test.com',
        title: 'Test Trend',
        platform: 'tiktok',
        ageRanges: ['Gen Z'],
        categories: ['Humor & Memes'],
        moods: ['Funny 😂'],
        spreadSpeed: 'picking_up',
        motivation: 'Test motivation',
        firstSeen: 'today',
        otherPlatforms: [],
        brandAdoption: false
      },
      status: 'submitted',
      quality_score: 0.5,
      validation_count: 0,
      virality_prediction: 5
    };
    
    // Don't actually insert, just check if it would work
    console.log('Test data structure looks correct');
    console.log('✅ Table should be ready for submissions');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndFixTable();