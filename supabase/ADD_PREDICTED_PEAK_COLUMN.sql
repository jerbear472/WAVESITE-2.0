-- =============================================
-- ADD PREDICTED PEAK DATE COLUMN FOR TREND PREDICTIONS
-- =============================================
-- This migration adds support for users to predict when a trend will peak
-- Used in the SmartTrendSubmission component

BEGIN;

-- Add predicted_peak_date column to trend_submissions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'predicted_peak_date'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN predicted_peak_date TIMESTAMPTZ;
        
        COMMENT ON COLUMN public.trend_submissions.predicted_peak_date IS 
        'User prediction of when this trend will reach peak popularity';
        
        RAISE NOTICE 'Added predicted_peak_date column to trend_submissions table';
    ELSE
        RAISE NOTICE 'predicted_peak_date column already exists in trend_submissions table';
    END IF;
END $$;

-- Also check if we need to add columns for new trend intelligence fields
DO $$
BEGIN
    -- Add trend_velocity column if it doesn't exist (stores: just_starting, picking_up, viral, saturated, declining)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'trend_velocity'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN trend_velocity TEXT;
        
        COMMENT ON COLUMN public.trend_submissions.trend_velocity IS 
        'Current velocity/momentum of the trend (just_starting, picking_up, viral, saturated, declining)';
        
        RAISE NOTICE 'Added trend_velocity column to trend_submissions table';
    END IF;

    -- Add trend_size column if it doesn't exist (stores: under_10k, 10k_100k, 100k_1m, 1m_10m, over_10m)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'trend_size'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN trend_size TEXT;
        
        COMMENT ON COLUMN public.trend_submissions.trend_size IS 
        'Estimated audience size/reach of the trend';
        
        RAISE NOTICE 'Added trend_size column to trend_submissions table';
    END IF;

    -- Add ai_angle column if it doesn't exist (stores: using_ai, reacting_to_ai, ai_tool_viral, ai_technique, anti_ai, not_ai)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'ai_angle'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN ai_angle TEXT;
        
        COMMENT ON COLUMN public.trend_submissions.ai_angle IS 
        'AI-related angle of the trend if applicable';
        
        RAISE NOTICE 'Added ai_angle column to trend_submissions table';
    END IF;

    -- Add audience_age_ranges column if it doesn't exist (stores array of age ranges)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'audience_age_ranges'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN audience_age_ranges TEXT[] DEFAULT '{}';
        
        COMMENT ON COLUMN public.trend_submissions.audience_age_ranges IS 
        'Target audience age ranges for this trend';
        
        RAISE NOTICE 'Added audience_age_ranges column to trend_submissions table';
    END IF;

    -- Add title column if it doesn't exist (for trend headline/title)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN title TEXT;
        
        COMMENT ON COLUMN public.trend_submissions.title IS 
        'Trend title or headline';
        
        RAISE NOTICE 'Added title column to trend_submissions table';
    END IF;
END $$;

-- Create an index on predicted_peak_date for efficient querying
CREATE INDEX IF NOT EXISTS idx_trend_submissions_predicted_peak 
ON public.trend_submissions(predicted_peak_date) 
WHERE predicted_peak_date IS NOT NULL;

-- Create indexes for the new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_trend_velocity 
ON public.trend_submissions(trend_velocity) 
WHERE trend_velocity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trend_submissions_trend_size 
ON public.trend_submissions(trend_size) 
WHERE trend_size IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trend_submissions_ai_angle 
ON public.trend_submissions(ai_angle) 
WHERE ai_angle IS NOT NULL;

-- Add a function to analyze prediction accuracy (for future use)
CREATE OR REPLACE FUNCTION calculate_peak_prediction_accuracy(
    p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
    total_predictions INT,
    accurate_predictions INT,
    accuracy_rate DECIMAL(5,2),
    avg_days_off DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT as total_predictions,
        COUNT(CASE 
            WHEN predicted_peak_date IS NOT NULL 
            AND status IN ('viral', 'approved') 
            AND ABS(EXTRACT(EPOCH FROM (predicted_peak_date - approved_at))/86400) <= 3 
            THEN 1 
        END)::INT as accurate_predictions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE 
                    WHEN predicted_peak_date IS NOT NULL 
                    AND status IN ('viral', 'approved') 
                    AND ABS(EXTRACT(EPOCH FROM (predicted_peak_date - approved_at))/86400) <= 3 
                    THEN 1 
                END)::DECIMAL / COUNT(*)::DECIMAL * 100)
            ELSE 0 
        END as accuracy_rate,
        AVG(ABS(EXTRACT(EPOCH FROM (predicted_peak_date - approved_at))/86400))::DECIMAL(10,2) as avg_days_off
    FROM public.trend_submissions
    WHERE predicted_peak_date IS NOT NULL
    AND (p_user_id IS NULL OR spotter_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_peak_prediction_accuracy IS 
'Calculates how accurate users are at predicting trend peaks. Considers predictions within 3 days as accurate.';

COMMIT;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN (
    'predicted_peak_date', 
    'trend_velocity', 
    'trend_size', 
    'ai_angle', 
    'audience_age_ranges',
    'title'
)
ORDER BY column_name;