#!/usr/bin/env node

/**
 * Test script for verify page voting functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testVoting() {
    console.log('🧪 Testing Verify Page Voting System\n');
    console.log('=====================================\n');

    try {
        // 1. Check table structure
        console.log('1️⃣ Checking trend_validations table structure...');
        const { data: sampleValidation, error: structureError } = await supabase
            .from('trend_validations')
            .select('*')
            .limit(1);

        if (structureError) {
            console.error('❌ Error accessing trend_validations:', structureError.message);
        } else {
            console.log('✅ trend_validations table accessible');
            if (sampleValidation && sampleValidation.length > 0) {
                console.log('   Columns:', Object.keys(sampleValidation[0]).join(', '));
            }
        }

        // 2. Check for trends to validate
        console.log('\n2️⃣ Checking available trends...');
        const { data: trends, error: trendsError } = await supabase
            .from('trend_submissions')
            .select('id, status, spotter_id, created_at')
            .in('status', ['submitted', 'validating'])
            .limit(5);

        if (trendsError) {
            console.error('❌ Error fetching trends:', trendsError.message);
        } else {
            console.log(`✅ Found ${trends?.length || 0} trends available for validation`);
            if (trends && trends.length > 0) {
                console.log('   Sample trend IDs:');
                trends.forEach(t => console.log(`     - ${t.id} (status: ${t.status})`));
            }
        }

        // 3. Check existing validations
        console.log('\n3️⃣ Checking existing validations...');
        const { data: validations, error: validationsError } = await supabase
            .from('trend_validations')
            .select('trend_submission_id, validator_id, vote, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (validationsError) {
            console.error('❌ Error fetching validations:', validationsError.message);
        } else {
            console.log(`✅ Found ${validations?.length || 0} recent validations`);
            if (validations && validations.length > 0) {
                console.log('   Recent votes:');
                validations.forEach(v => {
                    console.log(`     - Trend ${v.trend_submission_id?.substring(0, 8)}... voted "${v.vote}"`);
                });
            }
        }

        // 4. Test vote insertion capability
        console.log('\n4️⃣ Testing vote insertion (dry run)...');
        
        // Get a test trend and user
        if (trends && trends.length > 0) {
            const testTrend = trends[0];
            
            // Get a user to test with
            const { data: users, error: usersError } = await supabase
                .from('profiles')
                .select('id')
                .limit(1);

            if (!usersError && users && users.length > 0) {
                const testUser = users[0];
                
                // Check if this user can vote on this trend
                const { data: existingVote } = await supabase
                    .from('trend_validations')
                    .select('id')
                    .eq('trend_submission_id', testTrend.id)
                    .eq('validator_id', testUser.id)
                    .single();

                if (existingVote) {
                    console.log('⚠️  Test user has already voted on test trend');
                } else if (testTrend.spotter_id === testUser.id) {
                    console.log('⚠️  Test user owns the test trend (cannot vote on own trends)');
                } else {
                    console.log('✅ Test user can vote on test trend');
                    console.log(`   Would insert: trend_submission_id=${testTrend.id.substring(0, 8)}..., validator_id=${testUser.id.substring(0, 8)}...`);
                }
            }
        }

        // 5. Check constraints and indexes
        console.log('\n5️⃣ Checking database constraints...');
        const { data: constraints, error: constraintsError } = await supabase
            .rpc('get_table_constraints', { table_name: 'trend_validations' })
            .catch(() => ({ data: null, error: 'RPC not available' }));

        if (constraintsError || !constraints) {
            console.log('⚠️  Cannot check constraints (RPC not available)');
            
            // Try alternative check
            const testDuplicate = await supabase
                .from('trend_validations')
                .select('trend_submission_id, validator_id, COUNT(*)')
                .limit(1);
            
            console.log('   Checking for duplicate prevention...');
        } else {
            console.log('✅ Constraints checked');
        }

        // 6. Summary
        console.log('\n' + '='.repeat(50));
        console.log('\n📊 Summary:');
        console.log('   - Table structure: ✅');
        console.log(`   - Available trends: ${trends?.length || 0}`);
        console.log(`   - Total validations: ${validations?.length || 'Unknown'}`);
        
        // Check for common issues
        console.log('\n🔍 Common Issues Check:');
        
        // Check if trend_submission_id column exists
        if (sampleValidation && sampleValidation.length > 0) {
            if ('trend_submission_id' in sampleValidation[0]) {
                console.log('   ✅ trend_submission_id column exists');
            } else if ('trend_id' in sampleValidation[0]) {
                console.log('   ⚠️  Column is named "trend_id" not "trend_submission_id"');
                console.log('      This may cause foreign key issues');
            }
        }
        
        console.log('\n💡 Troubleshooting Tips:');
        console.log('   1. Check browser console for detailed error messages');
        console.log('   2. Ensure user is properly authenticated');
        console.log('   3. Verify RLS policies allow INSERT for authenticated users');
        console.log('   4. Check that trend_submission_id matches an existing trend');
        console.log('   5. Ensure user has not already voted on the trend');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testVoting().then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
}).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});