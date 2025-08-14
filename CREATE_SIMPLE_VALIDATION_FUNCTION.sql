-- Create a simple validation function that handles everything
CREATE OR REPLACE FUNCTION simple_validate_trend(
    p_trend_id UUID,
    p_validator_id UUID,
    p_is_genuine BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Try to insert the validation
    BEGIN
        INSERT INTO trend_validations (
            trend_id,
            validator_id,
            is_genuine,
            vote,
            created_at
        ) VALUES (
            p_trend_id,
            p_validator_id,
            p_is_genuine,
            CASE WHEN p_is_genuine THEN 'verify' ELSE 'reject' END,
            NOW()
        );
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Validation recorded successfully'
        );
    EXCEPTION 
        WHEN unique_violation THEN
            v_result := jsonb_build_object(
                'success', false,
                'error', 'duplicate',
                'message', 'You have already validated this trend'
            );
        WHEN foreign_key_violation THEN
            v_result := jsonb_build_object(
                'success', false,
                'error', 'not_found',
                'message', 'Trend not found'
            );
        WHEN OTHERS THEN
            v_result := jsonb_build_object(
                'success', false,
                'error', 'unknown',
                'message', SQLERRM
            );
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION simple_validate_trend TO authenticated;

-- Test the function
SELECT simple_validate_trend(
    'test-trend-id'::UUID,
    'test-user-id'::UUID,
    true
);