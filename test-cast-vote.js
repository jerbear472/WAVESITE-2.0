#!/usr/bin/env node

/**
 * Test the cast_trend_vote function
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables');
    console.error('Need: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

async function testCastVote() {
    console.log('🧪 Testing cast_trend_vote Function\n');
    console.log('=====================================\n');

    // Create client with anon key (simulating frontend)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        // 1. First, sign in as a test user
        console.log('1️⃣ Authenticating...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'test@example.com', // Replace with a real test user
            password: 'testpassword'    // Replace with real password
        });

        if (authError) {
            console.log('⚠️  Could not authenticate. Testing with anon access...');
            console.log('   Error:', authError.message);
        } else {
            console.log('✅ Authenticated as:', authData.user?.email);
        }

        // 2. Get a trend to vote on
        console.log('\n2️⃣ Finding a trend to test with...');
        const { data: trends, error: trendsError } = await supabase
            .from('trend_submissions')
            .select('id, spotter_id, status')
            .in('status', ['submitted', 'validating'])
            .limit(1);

        if (trendsError) {
            console.error('❌ Error fetching trends:', trendsError);
            return;
        }

        if (!trends || trends.length === 0) {
            console.log('⚠️  No trends available to test voting');
            return;
        }

        const testTrend = trends[0];
        console.log('✅ Found test trend:', testTrend.id);

        // 3. Test the cast_trend_vote function
        console.log('\n3️⃣ Testing cast_trend_vote function...');
        
        // Test with invalid parameters first
        console.log('\n   Testing with invalid vote type:');
        const { data: invalidResult, error: invalidError } = await supabase
            .rpc('cast_trend_vote', {
                trend_id: testTrend.id,
                vote_type: 'invalid'
            });

        if (invalidError) {
            console.log('   ❌ RPC error:', invalidError.message);
        } else if (invalidResult) {
            console.log('   Result:', invalidResult);
        }

        // Test with valid vote
        console.log('\n   Testing with valid vote (verify):');
        const { data: validResult, error: validError } = await supabase
            .rpc('cast_trend_vote', {
                trend_id: testTrend.id,
                vote_type: 'verify'
            });

        if (validError) {
            console.log('   ❌ RPC error:', validError.message);
            console.log('   This might mean:');
            console.log('     - The function does not exist yet');
            console.log('     - You need to run fix-recursion-aggressive.sql');
            console.log('     - Authentication is required');
        } else if (validResult) {
            console.log('   ✅ Vote result:', validResult);
            
            if (validResult.success) {
                console.log('   🎉 Vote was successful!');
            } else {
                console.log('   ⚠️  Vote failed:', validResult.error);
            }
        }

        // 4. Verify the vote was recorded
        if (validResult?.success) {
            console.log('\n4️⃣ Verifying vote was recorded...');
            const { data: validation, error: valError } = await supabase
                .from('trend_validations')
                .select('*')
                .eq('id', validResult.id)
                .single();

            if (valError) {
                console.log('   ❌ Could not verify:', valError.message);
            } else {
                console.log('   ✅ Vote confirmed in database:', validation);
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Sign out
        await supabase.auth.signOut();
    }
}

// Run the test
console.log('🚀 Cast Vote Function Test');
console.log('==========================\n');
console.log('This tests the new cast_trend_vote RPC function');
console.log('that bypasses RLS to avoid recursion.\n');

testCastVote().then(() => {
    console.log('\n✨ Test completed!');
    console.log('\nIf the function does not exist, run this SQL:');
    console.log('  fix-recursion-aggressive.sql');
    process.exit(0);
}).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});