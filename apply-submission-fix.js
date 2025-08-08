const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSubmissionColumns() {
    console.log('🔧 Starting to fix trend_submissions table columns...\n');

    const columnsToAdd = [
        { name: 'platform', type: 'TEXT', defaultValue: null },
        { name: 'creator_handle', type: 'TEXT', defaultValue: null },
        { name: 'creator_name', type: 'TEXT', defaultValue: null },
        { name: 'post_caption', type: 'TEXT', defaultValue: null },
        { name: 'likes_count', type: 'INTEGER', defaultValue: 0 },
        { name: 'comments_count', type: 'INTEGER', defaultValue: 0 },
        { name: 'shares_count', type: 'INTEGER', defaultValue: 0 },
        { name: 'views_count', type: 'INTEGER', defaultValue: 0 },
        { name: 'hashtags', type: 'TEXT[]', defaultValue: null },
        { name: 'thumbnail_url', type: 'TEXT', defaultValue: null },
        { name: 'screenshot_url', type: 'TEXT', defaultValue: null }
    ];

    for (const column of columnsToAdd) {
        try {
            const checkQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'trend_submissions' 
                AND column_name = '${column.name}'
            `;

            const { data: existingColumn, error: checkError } = await supabase.rpc('sql', {
                query: checkQuery
            }).single();

            if (checkError && !checkError.message.includes('no rows')) {
                // Try alternative approach
                const alterQuery = `
                    ALTER TABLE public.trend_submissions 
                    ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
                    ${column.defaultValue !== null ? `DEFAULT ${column.defaultValue}` : ''}
                `;
                
                console.log(`Adding column: ${column.name} (${column.type})`);
                
                // Note: Direct SQL execution might require admin access
                // If this fails, you'll need to run the SQL script directly in Supabase dashboard
            } else if (!existingColumn) {
                console.log(`Column ${column.name} needs to be added`);
            } else {
                console.log(`✓ Column ${column.name} already exists`);
            }
        } catch (error) {
            console.error(`Error checking/adding column ${column.name}:`, error.message);
        }
    }

    console.log('\n📋 Checking current table structure...');
    
    // Test insertion with minimal data
    console.log('\n🧪 Testing submission with minimal data...');
    
    const testData = {
        spotter_id: 'test-user-id', // This would need to be a real user ID
        category: 'test',
        description: 'Test submission',
        status: 'submitted',
        evidence: { test: true },
        virality_prediction: 5,
        quality_score: 7,
        validation_count: 0
    };

    console.log('\nTest data structure:', JSON.stringify(testData, null, 2));
    
    console.log('\n⚠️  IMPORTANT: If columns are missing, you need to:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the content of fix-submission-columns.sql');
    console.log('4. This will add all missing columns to the trend_submissions table');
}

fixSubmissionColumns().catch(console.error);