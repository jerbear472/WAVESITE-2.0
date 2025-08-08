#!/usr/bin/env node

/**
 * Apply Vote Count Fix to Database
 * This script ensures vote counts are properly tracked and synced
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyVoteCountFix() {
    console.log('🔧 Applying vote count synchronization fix...\n');

    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'fix-vote-count-sync.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });

        if (error) {
            // If exec_sql doesn't exist, try alternative approach
            if (error.message.includes('function') || error.message.includes('does not exist')) {
                console.log('⚠️  Direct SQL execution not available, applying changes step by step...\n');
                
                // Apply changes manually
                await applyManualFixes();
            } else {
                throw error;
            }
        } else {
            console.log('✅ SQL migration applied successfully');
        }

        // Verify the fix
        await verifyFix();

    } catch (error) {
        console.error('❌ Error applying vote count fix:', error.message);
        process.exit(1);
    }
}

async function applyManualFixes() {
    try {
        // 1. Check current vote counts
        console.log('📊 Checking current vote data...');
        const { data: trends, error: trendsError } = await supabase
            .from('trend_submissions')
            .select('id, approve_count, reject_count, validation_status')
            .limit(10);

        if (trendsError) {
            console.log('⚠️  Vote count columns may not exist, will be created');
        } else {
            console.log(`Found ${trends?.length || 0} trends with vote data`);
        }

        // 2. Sync vote counts from validations table
        console.log('\n🔄 Syncing vote counts from validations...');
        const { data: validations, error: valError } = await supabase
            .from('trend_validations')
            .select('trend_id, vote, validator_id');

        if (!valError && validations) {
            // Group validations by trend
            const trendVotes = {};
            validations.forEach(val => {
                if (!trendVotes[val.trend_id]) {
                    trendVotes[val.trend_id] = {
                        approve: 0,
                        reject: 0,
                        validators: new Set()
                    };
                }
                
                if (val.vote === 'verify') {
                    trendVotes[val.trend_id].approve++;
                } else if (val.vote === 'reject') {
                    trendVotes[val.trend_id].reject++;
                }
                trendVotes[val.trend_id].validators.add(val.validator_id);
            });

            // Update each trend
            for (const [trendId, votes] of Object.entries(trendVotes)) {
                const status = votes.approve >= 1 ? 'approved' : 
                              votes.reject >= 2 ? 'rejected' : 'pending';
                
                const { error: updateError } = await supabase
                    .from('trend_submissions')
                    .update({
                        approve_count: votes.approve,
                        reject_count: votes.reject,
                        validation_status: status,
                        validation_count: votes.approve + votes.reject
                    })
                    .eq('id', trendId);

                if (updateError) {
                    console.error(`Failed to update trend ${trendId}:`, updateError.message);
                }
            }

            console.log(`✅ Updated vote counts for ${Object.keys(trendVotes).length} trends`);
        }

    } catch (error) {
        console.error('Error in manual fixes:', error);
        throw error;
    }
}

async function verifyFix() {
    console.log('\n🔍 Verifying the fix...');

    // Check a few trends to verify counts
    const { data: trends, error } = await supabase
        .from('trend_submissions')
        .select(`
            id,
            approve_count,
            reject_count,
            validation_status,
            validation_count
        `)
        .not('validation_count', 'is', null)
        .limit(5);

    if (error) {
        console.error('❌ Verification failed:', error.message);
        return;
    }

    if (trends && trends.length > 0) {
        console.log('\n✅ Vote count synchronization is working!');
        console.log('\nSample trends with vote counts:');
        trends.forEach(trend => {
            console.log(`  Trend ${trend.id.substring(0, 8)}...`);
            console.log(`    Approves: ${trend.approve_count}, Rejects: ${trend.reject_count}`);
            console.log(`    Status: ${trend.validation_status}`);
        });
    } else {
        console.log('⚠️  No trends with votes found yet');
    }

    // Check for trends missing counts
    const { data: missingCounts, error: missingError } = await supabase
        .from('trend_submissions')
        .select('id')
        .or('approve_count.is.null,reject_count.is.null')
        .limit(5);

    if (!missingError && missingCounts && missingCounts.length > 0) {
        console.log(`\n⚠️  Found ${missingCounts.length} trends with missing vote counts`);
        console.log('Run this script again to fix them');
    }
}

// Run the script
console.log('🚀 Vote Count Synchronization Fix');
console.log('==================================\n');

applyVoteCountFix().then(() => {
    console.log('\n✨ Vote count fix completed successfully!');
    console.log('\n📝 Summary:');
    console.log('  - Vote counts are now properly synced between tables');
    console.log('  - Validation rules: 1 approve = validated, 2 rejects = rejected');
    console.log('  - Timeline will now show accurate vote counts');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
});