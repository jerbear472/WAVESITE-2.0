-- Fix validation system column naming issues
-- This migration ensures trend_validations table has the correct columns

-- Step 1: Add trend_id column if it doesn't exist (copying from trend_submission_id if present)
DO $$
BEGIN
    -- Check if trend_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_id'
    ) THEN
        -- Check if trend_submission_id exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_validations' 
            AND column_name = 'trend_submission_id'
        ) THEN
            -- Add trend_id column
            ALTER TABLE trend_validations ADD COLUMN trend_id UUID;
            
            -- Copy data from trend_submission_id to trend_id
            UPDATE trend_validations SET trend_id = trend_submission_id;
            
            -- Make trend_id NOT NULL if trend_submission_id was NOT NULL
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'trend_validations' 
                AND column_name = 'trend_submission_id'
                AND is_nullable = 'NO'
            ) THEN
                ALTER TABLE trend_validations ALTER COLUMN trend_id SET NOT NULL;
            END IF;
            
            -- Add foreign key constraint if trend_submission_id had one
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'trend_validations' 
                AND kcu.column_name = 'trend_submission_id'
                AND tc.constraint_type = 'FOREIGN KEY'
            ) THEN
                ALTER TABLE trend_validations 
                ADD CONSTRAINT trend_validations_trend_id_fkey 
                FOREIGN KEY (trend_id) REFERENCES trend_submissions(id) ON DELETE CASCADE;
            END IF;
            
            RAISE NOTICE 'Successfully added trend_id column and migrated data from trend_submission_id';
        ELSE
            -- No trend_submission_id, just add trend_id
            ALTER TABLE trend_validations ADD COLUMN trend_id UUID NOT NULL;
            ALTER TABLE trend_validations 
            ADD CONSTRAINT trend_validations_trend_id_fkey 
            FOREIGN KEY (trend_id) REFERENCES trend_submissions(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Added trend_id column';
        END IF;
    END IF;
END $$;

-- Step 2: Ensure validator_id exists (may be named user_id in some installations)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'validator_id'
    ) THEN
        -- Check if user_id exists and rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_validations' 
            AND column_name = 'user_id'
        ) THEN
            ALTER TABLE trend_validations RENAME COLUMN user_id TO validator_id;
            RAISE NOTICE 'Renamed user_id to validator_id';
        ELSE
            -- Neither exists, add validator_id
            ALTER TABLE trend_validations ADD COLUMN validator_id UUID NOT NULL;
            ALTER TABLE trend_validations 
            ADD CONSTRAINT trend_validations_validator_id_fkey 
            FOREIGN KEY (validator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added validator_id column';
        END IF;
    END IF;
END $$;

-- Step 3: Update or create the cast_trend_vote function to use trend_id
CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_validator_id UUID;
    v_existing_vote TEXT;
    v_result JSON;
BEGIN
    -- Get the current user ID
    v_validator_id := auth.uid();
    
    IF v_validator_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Check if trend exists
    IF NOT EXISTS (SELECT 1 FROM trend_submissions WHERE id = p_trend_id) THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;

    -- Check for existing vote
    SELECT vote INTO v_existing_vote
    FROM trend_validations
    WHERE trend_id = p_trend_id AND validator_id = v_validator_id;

    IF v_existing_vote IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'You have already voted on this trend');
    END IF;

    -- Insert the validation
    INSERT INTO trend_validations (trend_id, validator_id, vote, created_at)
    VALUES (p_trend_id, v_validator_id, p_vote, NOW());

    -- Update the trend submission counts
    IF p_vote = 'approve' THEN
        UPDATE trend_submissions 
        SET validation_count = COALESCE(validation_count, 0) + 1,
            approve_count = COALESCE(approve_count, 0) + 1
        WHERE id = p_trend_id;
    ELSIF p_vote = 'reject' THEN
        UPDATE trend_submissions 
        SET validation_count = COALESCE(validation_count, 0) + 1,
            reject_count = COALESCE(reject_count, 0) + 1
        WHERE id = p_trend_id;
    ELSIF p_vote = 'skip' THEN
        UPDATE trend_submissions 
        SET skip_count = COALESCE(skip_count, 0) + 1
        WHERE id = p_trend_id;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Vote cast successfully');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 4: Create a view that provides clean trend data for validation
CREATE OR REPLACE VIEW trends_for_validation AS
SELECT 
    ts.id,
    ts.created_at,
    ts.title,
    ts.description,
    ts.category,
    ts.platform,
    ts.url as source_url,
    ts.url as post_url,
    ts.thumbnail_url,
    ts.screenshot_url,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.follower_count,
    ts.hashtags,
    ts.posted_at,
    ts.wave_score,
    ts.quality_score,
    ts.virality_prediction,
    ts.confidence_score,
    ts.trending_position,
    COALESCE(ts.validation_count, 0) as validation_count,
    COALESCE(ts.approve_count, 0) as approve_count,
    COALESCE(ts.reject_count, 0) as reject_count,
    ts.submitter_id as spotter_id,
    EXTRACT(EPOCH FROM (NOW() - ts.posted_at))/3600 as hours_since_post,
    -- Clean up evidence field - only include if it has actual data
    CASE 
        WHEN ts.evidence IS NOT NULL AND ts.evidence::text != '{}' 
        THEN ts.evidence
        ELSE NULL
    END as evidence
FROM trend_submissions ts
WHERE ts.status = 'pending'
AND (ts.approve_count < 2 OR ts.approve_count IS NULL)
AND (ts.reject_count < 2 OR ts.reject_count IS NULL);

-- Grant permissions
GRANT SELECT ON trends_for_validation TO authenticated;

-- Step 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id ON trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_validator ON trend_validations(trend_id, validator_id);

COMMENT ON FUNCTION cast_trend_vote IS 'Function to cast a validation vote on a trend submission';
COMMENT ON VIEW trends_for_validation IS 'Clean view of trends ready for validation';