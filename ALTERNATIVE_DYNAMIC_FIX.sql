-- ALTERNATIVE DYNAMIC FIX
-- This creates a function that dynamically adapts to your column structure

DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_sql TEXT;
    v_result JSON;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Build dynamic SQL based on actual column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
        AND table_schema = 'public'
    ) THEN
        -- Use trend_submission_id
        v_sql := format(
            'SELECT cast_vote_internal($1, $2, $3, %L)',
            'trend_submission_id'
        );
    ELSE
        -- Use trend_id
        v_sql := format(
            'SELECT cast_vote_internal($1, $2, $3, %L)',
            'trend_id'
        );
    END IF;
    
    -- Create the internal function
    CREATE OR REPLACE FUNCTION cast_vote_internal(
        p_tid UUID,
        p_uid UUID,
        p_vte TEXT,
        p_col TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    AS $inner$
    DECLARE
        v_spotter_id UUID;
        v_approve INT := 0;
        v_reject INT := 0;
    BEGIN
        -- Get spotter
        SELECT spotter_id INTO v_spotter_id
        FROM trend_submissions WHERE id = p_tid;
        
        IF v_spotter_id IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Trend not found');
        END IF;
        
        -- Check if voted
        IF p_col = 'trend_submission_id' THEN
            IF EXISTS (
                SELECT 1 FROM trend_validations 
                WHERE trend_submission_id = p_tid 
                AND validator_id = p_uid
            ) THEN
                RETURN json_build_object('success', false, 'error', 'Already voted');
            END IF;
            
            INSERT INTO trend_validations (trend_submission_id, validator_id, vote, created_at)
            VALUES (p_tid, p_uid, p_vte, NOW());
        ELSE
            IF EXISTS (
                SELECT 1 FROM trend_validations 
                WHERE trend_id = p_tid 
                AND validator_id = p_uid
            ) THEN
                RETURN json_build_object('success', false, 'error', 'Already voted');
            END IF;
            
            INSERT INTO trend_validations (trend_id, validator_id, vote, created_at)
            VALUES (p_tid, p_uid, p_vte, NOW());
        END IF;
        
        -- Update counts
        IF p_vte = 'verify' THEN
            UPDATE trend_submissions
            SET approve_count = COALESCE(approve_count, 0) + 1,
                validation_count = COALESCE(validation_count, 0) + 1
            WHERE id = p_tid
            RETURNING approve_count INTO v_approve;
        ELSE
            UPDATE trend_submissions
            SET reject_count = COALESCE(reject_count, 0) + 1,
                validation_count = COALESCE(validation_count, 0) + 1
            WHERE id = p_tid
            RETURNING reject_count INTO v_reject;
        END IF;
        
        -- Get both counts
        SELECT approve_count, reject_count INTO v_approve, v_reject
        FROM trend_submissions WHERE id = p_tid;
        
        -- Check threshold
        IF COALESCE(v_approve, 0) >= 2 THEN
            UPDATE trend_submissions
            SET status = 'approved'::trend_status
            WHERE id = p_tid;
            
            UPDATE profiles
            SET awaiting_verification = GREATEST(0, COALESCE(awaiting_verification, 0) - 1),
                earnings_approved = COALESCE(earnings_approved, 0) + 1
            WHERE id = v_spotter_id;
        ELSIF COALESCE(v_reject, 0) >= 2 THEN
            UPDATE trend_submissions
            SET status = 'rejected'::trend_status
            WHERE id = p_tid;
            
            UPDATE profiles
            SET awaiting_verification = GREATEST(0, COALESCE(awaiting_verification, 0) - 1)
            WHERE id = v_spotter_id;
        END IF;
        
        -- Reward validator
        UPDATE profiles
        SET earnings_pending = COALESCE(earnings_pending, 0) + 0.01,
            total_earnings = COALESCE(total_earnings, 0) + 0.01
        WHERE id = p_uid;
        
        RETURN json_build_object(
            'success', true,
            'vote', p_vte,
            'approve_count', COALESCE(v_approve, 0),
            'reject_count', COALESCE(v_reject, 0)
        );
    END;
    $inner$;
    
    -- Execute the dynamic SQL
    EXECUTE v_sql INTO v_result USING p_trend_id, v_user_id, p_vote;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO anon;