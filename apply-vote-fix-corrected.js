#!/usr/bin/env node

/**
 * Apply vote count synchronization with correct column names
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

async function syncVoteCounts() {
    console.log('🔧 Syncing vote counts from trend_validations table...\n');

    try {
        // Get all validations
        const { data: validations, error: valError } = await supabase
            .from('trend_validations')
            .select('trend_submission_id, vote, validator_id');

        if (valError) {
            console.error('Error fetching validations:', valError.message);
            return;
        }

        console.log(`Found ${validations?.length || 0} total validation records`);

        // Group by trend
        const trendVotes = {};
        validations?.forEach(val => {
            const trendId = val.trend_submission_id;
            if (!trendVotes[trendId]) {
                trendVotes[trendId] = {
                    approve: 0,
                    reject: 0,
                    validators: new Set()
                };
            }
            
            if (val.vote === 'verify') {
                trendVotes[trendId].approve++;
            } else if (val.vote === 'reject') {
                trendVotes[trendId].reject++;
            }
            trendVotes[trendId].validators.add(val.validator_id);
        });

        console.log(`\n📊 Vote counts for ${Object.keys(trendVotes).length} trends:`);
        
        // Update each trend with vote counts
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const [trendId, votes] of Object.entries(trendVotes)) {
            const status = votes.approve >= 1 ? 'approved' : 
                          votes.reject >= 2 ? 'rejected' : 'pending';
            
            console.log(`\nTrend ${trendId.substring(0, 8)}...`);
            console.log(`  Approves: ${votes.approve}, Rejects: ${votes.reject}`);
            console.log(`  Status: ${status}`);
            console.log(`  Unique validators: ${votes.validators.size}`);
            
            // Try to update the trend
            const updateData = {
                validation_count: votes.approve + votes.reject
            };
            
            // Check if approve_count column exists by trying to update it
            const { error: updateError } = await supabase
                .from('trend_submissions')
                .update(updateData)
                .eq('id', trendId);

            if (updateError) {
                console.log(`  ⚠️  Could not update: ${updateError.message}`);
                errorCount++;
            } else {
                console.log(`  ✅ Updated validation_count`);
                updatedCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`\n📈 Summary:`);
        console.log(`  Total trends with votes: ${Object.keys(trendVotes).length}`);
        console.log(`  Successfully updated: ${updatedCount}`);
        if (errorCount > 0) {
            console.log(`  Failed updates: ${errorCount}`);
        }

        // Check if approve_count and reject_count columns exist
        console.log('\n🔍 Checking for vote count columns...');
        const { data: sampleTrend, error: sampleError } = await supabase
            .from('trend_submissions')
            .select('id, approve_count, reject_count, validation_status')
            .limit(1);

        if (sampleError && sampleError.message.includes('column')) {
            console.log('\n⚠️  The approve_count and reject_count columns do not exist yet.');
            console.log('\n📝 To add them, please run this SQL in your Supabase dashboard:\n');
            console.log('```sql');
            console.log('ALTER TABLE public.trend_submissions');
            console.log('ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,');
            console.log('ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,');
            console.log('ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT \'pending\';');
            console.log('```');
            console.log('\nThen run the full SQL migration: fix-vote-count-sync-corrected.sql');
        } else if (sampleTrend) {
            console.log('✅ Vote count columns exist!');
            
            // Now update with actual vote counts
            console.log('\n🔄 Updating vote counts in database...');
            for (const [trendId, votes] of Object.entries(trendVotes)) {
                const status = votes.approve >= 1 ? 'approved' : 
                              votes.reject >= 2 ? 'rejected' : 'pending';
                
                const { error } = await supabase
                    .from('trend_submissions')
                    .update({
                        approve_count: votes.approve,
                        reject_count: votes.reject,
                        validation_status: status,
                        validation_count: votes.approve + votes.reject
                    })
                    .eq('id', trendId);
                
                if (error) {
                    console.log(`Failed to update ${trendId}: ${error.message}`);
                }
            }
            console.log('✅ Vote counts updated!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the script
console.log('🚀 Vote Count Synchronization');
console.log('==============================\n');

syncVoteCounts().then(() => {
    console.log('\n✨ Process completed!');
    process.exit(0);
}).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});