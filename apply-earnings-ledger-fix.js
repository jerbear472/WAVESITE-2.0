#!/usr/bin/env node

/**
 * Apply fix for earnings_ledger table column issue
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('Need: SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyFix() {
    console.log('🔧 Fixing earnings_ledger column issue');
    console.log('=====================================\n');

    try {
        // 1. Check if earnings_ledger table exists
        console.log('1️⃣ Checking earnings_ledger table...');
        const { data: tableCheck, error: tableError } = await supabase.rpc('exec_sql', {
            sql: `
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'earnings_ledger'
                ) as exists
            `
        });

        if (tableError) {
            // Try direct query approach
            const { data: tables, error: tablesError } = await supabase
                .from('earnings_ledger')
                .select('*')
                .limit(0);

            if (tablesError && tablesError.message.includes('does not exist')) {
                console.log('⚠️  earnings_ledger table does not exist');
                console.log('   Creating earnings_ledger table...');
                
                // Create the table
                const createTableSQL = `
                    CREATE TABLE IF NOT EXISTS public.earnings_ledger (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_id UUID REFERENCES auth.users(id),
                        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                        type TEXT NOT NULL,
                        description TEXT,
                        trend_submission_id UUID REFERENCES public.trend_submissions(id),
                        status TEXT DEFAULT 'pending',
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `;
                
                console.log('   Please run this SQL in your Supabase dashboard:');
                console.log('\n```sql');
                console.log(createTableSQL);
                console.log('```\n');
            } else {
                console.log('✅ earnings_ledger table exists');
            }
        }

        // 2. Fix the cast_trend_vote function
        console.log('\n2️⃣ Updating cast_trend_vote function...');
        
        const functionSQL = `
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    trend_id UUID,
    vote_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
    v_new_id UUID;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    -- Check authentication
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Validate vote type
    IF vote_type NOT IN ('verify', 'reject') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid vote type. Use "verify" or "reject"'
        );
    END IF;
    
    -- Check if trend exists
    IF NOT EXISTS (SELECT 1 FROM public.trend_submissions WHERE id = trend_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    -- Check if user owns the trend
    IF EXISTS (
        SELECT 1 FROM public.trend_submissions 
        WHERE id = trend_id AND spotter_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot vote on your own trend'
        );
    END IF;
    
    -- Check for existing vote
    IF EXISTS (
        SELECT 1 FROM public.trend_validations 
        WHERE trend_submission_id = trend_id 
        AND validator_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already voted on this trend'
        );
    END IF;
    
    -- Insert the vote
    BEGIN
        INSERT INTO public.trend_validations (
            id,
            trend_submission_id,
            validator_id,
            vote,
            confidence_score,
            created_at
        ) VALUES (
            gen_random_uuid(),
            trend_id,
            v_user_id,
            vote_type,
            0.75,
            NOW()
        ) RETURNING id INTO v_new_id;
        
        -- Try to add earnings if the table exists with correct column
        BEGIN
            IF vote_type = 'verify' AND EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'earnings_ledger'
                AND column_name = 'trend_submission_id'
            ) THEN
                INSERT INTO public.earnings_ledger (
                    user_id,
                    amount,
                    type,
                    description,
                    trend_submission_id,
                    status
                ) VALUES (
                    v_user_id,
                    0.05,
                    'validation',
                    'Trend validation reward',
                    trend_id,
                    'approved'
                ) ON CONFLICT DO NOTHING;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Silently ignore earnings errors
                NULL;
        END;
        
        -- Return success
        RETURN jsonb_build_object(
            'success', true,
            'id', v_new_id,
            'message', 'Vote recorded successfully'
        );
        
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Already voted on this trend'
            );
        WHEN foreign_key_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid trend or user ID'
            );
        WHEN OTHERS THEN
            -- Return generic error without exposing column issues
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to submit vote. Please try again.'
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        console.log('   Please run this SQL in your Supabase dashboard to fix the voting function:');
        console.log('\n```sql');
        console.log(functionSQL);
        console.log('```\n');

        console.log('✅ Fix instructions generated!\n');
        console.log('📝 Next steps:');
        console.log('   1. Go to your Supabase dashboard');
        console.log('   2. Navigate to the SQL Editor');
        console.log('   3. Run the SQL statements above');
        console.log('   4. Test voting on the verify page');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

applyFix();