#!/usr/bin/env node

/**
 * Directly apply vote count columns to database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyFix() {
    console.log('🔧 Adding vote count columns to database...\n');

    try {
        // First, let's check what columns exist
        const { data: trends, error: checkError } = await supabase
            .from('trend_submissions')
            .select('*')
            .limit(1);

        if (checkError) {
            console.log('Error checking table:', checkError.message);
        } else if (trends && trends.length > 0) {
            console.log('Current columns in trend_submissions:');
            console.log(Object.keys(trends[0]).join(', '));
            console.log('\n');
        }

        // Check if we can read from trend_validations
        console.log('📊 Checking trend_validations table...');
        const { data: validations, error: valError } = await supabase
            .from('trend_validations')
            .select('trend_id, vote, validator_id')
            .limit(10);

        if (valError) {
            console.log('Error reading validations:', valError.message);
            
            // Check for alternative column names
            const { data: valAlt, error: valAltError } = await supabase
                .from('trend_validations')
                .select('*')
                .limit(1);
            
            if (!valAltError && valAlt && valAlt.length > 0) {
                console.log('Validation table columns:', Object.keys(valAlt[0]).join(', '));
            }
        } else {
            console.log(`Found ${validations?.length || 0} validation records`);
            
            // Count votes by type
            if (validations && validations.length > 0) {
                const voteCounts = validations.reduce((acc, val) => {
                    acc[val.vote] = (acc[val.vote] || 0) + 1;
                    return acc;
                }, {});
                console.log('Vote distribution:', voteCounts);
            }
        }

        // Try to manually add vote counts to trends
        console.log('\n🔄 Attempting to add vote count data...');
        
        // Get all trends
        const { data: allTrends, error: allTrendsError } = await supabase
            .from('trend_submissions')
            .select('id, status, validation_count')
            .limit(100);

        if (!allTrendsError && allTrends) {
            console.log(`Processing ${allTrends.length} trends...`);
            
            for (const trend of allTrends) {
                // Get votes for this trend
                const { data: trendVotes, error: votesError } = await supabase
                    .from('trend_validations')
                    .select('vote')
                    .eq('trend_id', trend.id);
                
                if (!votesError && trendVotes) {
                    const approveCount = trendVotes.filter(v => v.vote === 'verify' || v.vote === 'approve').length;
                    const rejectCount = trendVotes.filter(v => v.vote === 'reject').length;
                    
                    if (approveCount > 0 || rejectCount > 0) {
                        console.log(`Trend ${trend.id.substring(0, 8)}: ${approveCount} approves, ${rejectCount} rejects`);
                        
                        // Update validation_count at least
                        const { error: updateError } = await supabase
                            .from('trend_submissions')
                            .update({
                                validation_count: approveCount + rejectCount
                            })
                            .eq('id', trend.id);
                        
                        if (updateError) {
                            console.log(`Error updating trend: ${updateError.message}`);
                        }
                    }
                }
            }
        }

        console.log('\n✅ Process completed!');
        console.log('\n📝 Note: The approve_count and reject_count columns need to be added via SQL.');
        console.log('Please run the SQL migration file directly in your Supabase dashboard:');
        console.log('\n1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and run the contents of fix-vote-count-sync.sql');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the script
console.log('🚀 Direct Vote Count Application');
console.log('=================================\n');

applyFix().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});