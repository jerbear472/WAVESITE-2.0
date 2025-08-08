#!/usr/bin/env node

/**
 * Simple test to check if voting works
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVoting() {
    console.log('🧪 Testing Voting System\n');
    
    try {
        // 1. Check if cast_trend_vote function exists
        console.log('1️⃣ Checking if cast_trend_vote function exists...');
        const { data: functions, error: funcError } = await supabase
            .rpc('cast_trend_vote', {
                trend_id: '00000000-0000-0000-0000-000000000000',
                vote_type: 'verify'
            });
        
        if (funcError) {
            if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
                console.log('❌ cast_trend_vote function does not exist');
                console.log('   Run: fix-vote-without-earnings.sql');
                return;
            } else {
                console.log('✅ Function exists (got expected error for invalid UUID)');
            }
        }
        
        // 2. Check trend_validations table
        console.log('\n2️⃣ Checking trend_validations table...');
        const { data: validations, error: valError } = await supabase
            .from('trend_validations')
            .select('*')
            .limit(1);
        
        if (valError) {
            console.log('❌ Error accessing trend_validations:', valError.message);
        } else {
            console.log('✅ trend_validations table accessible');
            if (validations && validations.length > 0) {
                const columns = Object.keys(validations[0]);
                console.log('   Columns:', columns.join(', '));
                
                // Check for required columns
                const required = ['trend_submission_id', 'validator_id', 'vote'];
                const missing = required.filter(col => !columns.includes(col));
                if (missing.length > 0) {
                    console.log('   ⚠️  Missing columns:', missing.join(', '));
                }
            }
        }
        
        // 3. Check if earnings_ledger exists and what columns it has
        console.log('\n3️⃣ Checking earnings_ledger (optional)...');
        const { data: earnings, error: earnError } = await supabase
            .from('earnings_ledger')
            .select('*')
            .limit(1);
        
        if (earnError) {
            if (earnError.message.includes('does not exist')) {
                console.log('⚠️  earnings_ledger table does not exist (OK - voting should still work)');
            } else {
                console.log('⚠️  earnings_ledger error:', earnError.message);
            }
        } else {
            console.log('✅ earnings_ledger exists');
            if (earnings && earnings.length > 0) {
                const columns = Object.keys(earnings[0]);
                console.log('   Columns:', columns.join(', '));
                
                // Check which trend column exists
                if (columns.includes('trend_submission_id')) {
                    console.log('   ✅ Has trend_submission_id column');
                } else if (columns.includes('trend_id')) {
                    console.log('   ⚠️  Has trend_id (should be trend_submission_id)');
                } else {
                    console.log('   ❌ No trend reference column');
                }
            }
        }
        
        // 4. Get a real trend to test with
        console.log('\n4️⃣ Finding a trend to test...');
        const { data: trends, error: trendError } = await supabase
            .from('trend_submissions')
            .select('id, spotter_id, status')
            .in('status', ['submitted', 'validating'])
            .limit(1);
        
        if (trendError) {
            console.log('❌ Error fetching trends:', trendError.message);
        } else if (trends && trends.length > 0) {
            const trend = trends[0];
            console.log('✅ Found trend:', trend.id);
            
            // Get a test user (not the spotter)
            const { data: users, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .neq('id', trend.spotter_id)
                .limit(1);
            
            if (!userError && users && users.length > 0) {
                const testUser = users[0];
                console.log('✅ Found test user:', testUser.id.substring(0, 8) + '...');
                
                // Check if this user already voted
                const { data: existingVote } = await supabase
                    .from('trend_validations')
                    .select('id')
                    .eq('trend_submission_id', trend.id)
                    .eq('validator_id', testUser.id)
                    .single();
                
                if (existingVote) {
                    console.log('⚠️  Test user already voted on this trend');
                } else {
                    console.log('✅ Test user can vote on this trend');
                    console.log('\n   To test voting, the frontend should call:');
                    console.log('   supabase.rpc("cast_trend_vote", {');
                    console.log(`     trend_id: "${trend.id}",`);
                    console.log('     vote_type: "verify"');
                    console.log('   })');
                }
            }
        } else {
            console.log('⚠️  No trends available for testing');
        }
        
        // 5. Summary
        console.log('\n' + '='.repeat(50));
        console.log('\n📊 SUMMARY:');
        console.log('\nIf voting is failing with earnings_ledger errors:');
        console.log('1. Run: fix-vote-without-earnings.sql');
        console.log('   This completely removes earnings dependencies from voting');
        console.log('\n2. The voting will then work independently');
        console.log('   Earnings can be handled separately later');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testVoting().then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
}).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});