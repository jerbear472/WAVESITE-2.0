-- Complete Validation System Fix and Enhancement
-- This script unifies and enhances the trend validation system

-- First, ensure we have all necessary columns in trend_submissions
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS validation_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS positive_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS negative_validations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_ratio DECIMAL(3,2) DEFAULT 0.00;

-- Update trend_validations table with missing columns
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS validation_quality DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;

-- Create validation thresholds configuration table
CREATE TABLE IF NOT EXISTS public.validation_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category trend_category NOT NULL,
    min_validations INTEGER DEFAULT 5,
    approval_ratio DECIMAL(3,2) DEFAULT 0.70,
    high_confidence_ratio DECIMAL(3,2) DEFAULT 0.85,
    viral_threshold INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category)
);

-- Insert default thresholds for each category
INSERT INTO public.validation_thresholds (category, min_validations, approval_ratio, high_confidence_ratio, viral_threshold)
VALUES 
    ('visual_style', 5, 0.70, 0.85, 20),
    ('audio_music', 5, 0.70, 0.85, 20),
    ('creator_technique', 7, 0.75, 0.90, 25),
    ('meme_format', 5, 0.65, 0.80, 15),
    ('product_brand', 10, 0.80, 0.90, 30),
    ('behavior_pattern', 7, 0.75, 0.85, 25)
ON CONFLICT (category) DO NOTHING;

-- Create earnings configuration table
CREATE TABLE IF NOT EXISTS public.earnings_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type TEXT NOT NULL UNIQUE,
    base_amount DECIMAL(10,2) NOT NULL,
    quality_multiplier DECIMAL(3,2) DEFAULT 1.00,
    accuracy_bonus DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert earnings configuration
INSERT INTO public.earnings_config (action_type, base_amount, quality_multiplier, accuracy_bonus, description)
VALUES 
    ('validation_base', 0.10, 1.00, 0.00, 'Base payment for each validation'),
    ('validation_accurate', 0.10, 1.50, 0.05, 'Payment for accurate validations'),
    ('validation_early', 0.10, 2.00, 0.10, 'Bonus for early accurate validations'),
    ('trend_submission', 1.00, 1.00, 0.00, 'Base payment for trend submission'),
    ('trend_viral', 10.00, 5.00, 0.00, 'Bonus for viral trend submission')
ON CONFLICT (action_type) DO NOTHING;

-- Create validator performance tracking table
CREATE TABLE IF NOT EXISTS public.validator_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validator_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_validations INTEGER DEFAULT 0,
    accurate_validations INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(3,2) DEFAULT 0.00,
    earnings_total DECIMAL(10,2) DEFAULT 0.00,
    average_confidence DECIMAL(3,2) DEFAULT 0.00,
    categories_validated JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(validator_id, period_start, period_end)
);

-- Create function to update trend status based on validations
CREATE OR REPLACE FUNCTION public.update_trend_status_smart()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold validation_thresholds%ROWTYPE;
    v_positive_count INTEGER;
    v_negative_count INTEGER;
    v_total_count INTEGER;
    v_ratio DECIMAL(3,2);
    v_new_status trend_status;
BEGIN
    -- Get the threshold configuration for this trend's category
    SELECT * INTO v_threshold
    FROM validation_thresholds
    WHERE category = (SELECT category FROM trend_submissions WHERE id = NEW.trend_id);
    
    -- Count validations
    SELECT 
        COUNT(CASE WHEN confirmed THEN 1 END),
        COUNT(CASE WHEN NOT confirmed THEN 1 END),
        COUNT(*)
    INTO v_positive_count, v_negative_count, v_total_count
    FROM trend_validations
    WHERE trend_id = NEW.trend_id;
    
    -- Calculate ratio
    v_ratio := CASE 
        WHEN v_total_count > 0 THEN v_positive_count::DECIMAL / v_total_count::DECIMAL
        ELSE 0
    END;
    
    -- Determine new status
    v_new_status := CASE
        WHEN v_total_count >= v_threshold.viral_threshold AND v_ratio >= v_threshold.high_confidence_ratio THEN 'viral'
        WHEN v_total_count >= v_threshold.min_validations AND v_ratio >= v_threshold.approval_ratio THEN 'approved'
        WHEN v_total_count >= v_threshold.min_validations AND v_ratio < (1 - v_threshold.approval_ratio) THEN 'rejected'
        ELSE 'validating'
    END;
    
    -- Update trend submission
    UPDATE trend_submissions
    SET 
        validation_count = v_total_count,
        positive_validations = v_positive_count,
        negative_validations = v_negative_count,
        validation_ratio = v_ratio,
        status = v_new_status,
        validated_at = CASE 
            WHEN v_new_status IN ('approved', 'rejected', 'viral') AND validated_at IS NULL 
            THEN NOW() 
            ELSE validated_at 
        END
    WHERE id = NEW.trend_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_trend_on_validation ON trend_validations;
CREATE TRIGGER update_trend_on_validation
    AFTER INSERT OR UPDATE ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_status_smart();

-- Create function to calculate validator earnings
CREATE OR REPLACE FUNCTION public.calculate_validation_earnings(
    p_validator_id UUID,
    p_trend_id UUID,
    p_is_confirmed BOOLEAN,
    p_confidence_score DECIMAL(3,2)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_base_amount DECIMAL(10,2);
    v_accuracy_bonus DECIMAL(10,2);
    v_final_amount DECIMAL(10,2);
    v_trend_status trend_status;
    v_validation_order INTEGER;
BEGIN
    -- Get base amount from config
    SELECT base_amount INTO v_base_amount
    FROM earnings_config
    WHERE action_type = 'validation_base' AND is_active = TRUE;
    
    -- Get validation order (early bird bonus)
    SELECT COUNT(*) + 1 INTO v_validation_order
    FROM trend_validations
    WHERE trend_id = p_trend_id AND created_at < NOW();
    
    -- Calculate base earnings with confidence multiplier
    v_final_amount := v_base_amount * (0.5 + (p_confidence_score * 0.5));
    
    -- Add early bird bonus (first 3 validators get 50% bonus)
    IF v_validation_order <= 3 THEN
        v_final_amount := v_final_amount * 1.5;
    END IF;
    
    RETURN v_final_amount;
END;
$$ LANGUAGE plpgsql;

-- Create improved function to get trends for verification
CREATE OR REPLACE FUNCTION public.get_trends_to_verify_enhanced(
    p_user_id UUID, 
    p_limit INTEGER DEFAULT 20,
    p_categories trend_category[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    category trend_category,
    description TEXT,
    screenshot_url TEXT,
    thumbnail_url TEXT,
    post_url TEXT,
    spotter_id UUID,
    creator_handle TEXT,
    creator_name TEXT,
    post_caption TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    shares_count INTEGER,
    views_count INTEGER,
    hashtags TEXT[],
    platform TEXT,
    validation_count INTEGER,
    positive_validations INTEGER,
    negative_validations INTEGER,
    validation_ratio DECIMAL(3,2),
    status trend_status,
    spotter_username TEXT,
    spotter_email TEXT,
    time_since_submission INTERVAL,
    validation_threshold INTEGER,
    validations_needed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.created_at,
        ts.category,
        ts.description,
        ts.screenshot_url,
        ts.thumbnail_url,
        ts.post_url,
        ts.spotter_id,
        ts.creator_handle,
        ts.creator_name,
        ts.post_caption,
        ts.likes_count,
        ts.comments_count,
        ts.shares_count,
        ts.views_count,
        ts.hashtags,
        ts.platform,
        ts.validation_count,
        ts.positive_validations,
        ts.negative_validations,
        ts.validation_ratio,
        ts.status,
        up.username as spotter_username,
        up.email as spotter_email,
        NOW() - ts.created_at as time_since_submission,
        vt.min_validations as validation_threshold,
        GREATEST(0, vt.min_validations - ts.validation_count) as validations_needed
    FROM public.trend_submissions ts
    LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id
    LEFT JOIN public.validation_thresholds vt ON ts.category = vt.category
    WHERE ts.spotter_id != p_user_id
    AND ts.status IN ('submitted', 'validating')
    AND NOT EXISTS (
        SELECT 1 FROM public.trend_validations tv
        WHERE tv.trend_id = ts.id
        AND tv.validator_id = p_user_id
    )
    AND (p_categories IS NULL OR ts.category = ANY(p_categories))
    ORDER BY 
        -- Prioritize trends close to threshold
        CASE 
            WHEN ts.validation_count >= vt.min_validations - 2 THEN 0
            ELSE 1
        END,
        -- Then by time since submission (older first)
        ts.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced user stats function
CREATE OR REPLACE FUNCTION public.get_user_verification_stats_enhanced(p_user_id UUID)
RETURNS TABLE (
    verified_today INTEGER,
    verified_this_week INTEGER,
    verified_this_month INTEGER,
    earnings_today DECIMAL(10,2),
    earnings_this_week DECIMAL(10,2),
    earnings_this_month DECIMAL(10,2),
    accuracy_score DECIMAL(3,2),
    accuracy_trend TEXT,
    total_validations INTEGER,
    correct_validations INTEGER,
    category_expertise JSONB,
    validator_rank TEXT,
    streak_days INTEGER
) AS $$
DECLARE
    v_accuracy_7d DECIMAL(3,2);
    v_accuracy_30d DECIMAL(3,2);
BEGIN
    RETURN QUERY
    WITH validation_stats AS (
        SELECT 
            tv.*,
            ts.category,
            ts.status as trend_status,
            DATE(tv.created_at) as validation_date
        FROM trend_validations tv
        JOIN trend_submissions ts ON tv.trend_id = ts.id
        WHERE tv.validator_id = p_user_id
    ),
    daily_stats AS (
        SELECT 
            validation_date,
            COUNT(*) as daily_count
        FROM validation_stats
        WHERE validation_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY validation_date
    ),
    streak_calc AS (
        SELECT 
            MAX(streak_length) as max_streak
        FROM (
            SELECT 
                COUNT(*) as streak_length
            FROM (
                SELECT 
                    validation_date,
                    validation_date - ROW_NUMBER() OVER (ORDER BY validation_date)::INTEGER * INTERVAL '1 day' as streak_group
                FROM daily_stats
            ) t
            GROUP BY streak_group
        ) t2
    )
    SELECT 
        COUNT(CASE WHEN vs.validation_date = CURRENT_DATE THEN 1 END)::INTEGER as verified_today,
        COUNT(CASE WHEN vs.validation_date >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END)::INTEGER as verified_this_week,
        COUNT(CASE WHEN vs.validation_date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::INTEGER as verified_this_month,
        COALESCE(SUM(CASE WHEN vs.validation_date = CURRENT_DATE THEN vs.reward_amount END), 0)::DECIMAL(10,2) as earnings_today,
        COALESCE(SUM(CASE WHEN vs.validation_date >= DATE_TRUNC('week', CURRENT_DATE) THEN vs.reward_amount END), 0)::DECIMAL(10,2) as earnings_this_week,
        COALESCE(SUM(CASE WHEN vs.validation_date >= DATE_TRUNC('month', CURRENT_DATE) THEN vs.reward_amount END), 0)::DECIMAL(10,2) as earnings_this_month,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN vs.confirmed = (vs.trend_status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)::DECIMAL(3,2)
            ELSE 0::DECIMAL(3,2)
        END as accuracy_score,
        CASE 
            WHEN COUNT(CASE WHEN vs.validation_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) >= 10 THEN
                CASE 
                    WHEN (COUNT(CASE WHEN vs.validation_date >= CURRENT_DATE - INTERVAL '7 days' AND vs.confirmed = (vs.trend_status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / 
                          NULLIF(COUNT(CASE WHEN vs.validation_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END), 0)::DECIMAL * 100) >
                         (COUNT(CASE WHEN vs.validation_date >= CURRENT_DATE - INTERVAL '30 days' AND vs.confirmed = (vs.trend_status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / 
                          NULLIF(COUNT(CASE WHEN vs.validation_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END), 0)::DECIMAL * 100)
                    THEN 'improving'
                    ELSE 'declining'
                END
            ELSE 'insufficient_data'
        END as accuracy_trend,
        COUNT(*)::INTEGER as total_validations,
        COUNT(CASE WHEN vs.confirmed = (vs.trend_status IN ('approved', 'viral')) THEN 1 END)::INTEGER as correct_validations,
        (
            SELECT jsonb_object_agg(category, category_stats)
            FROM (
                SELECT 
                    category,
                    jsonb_build_object(
                        'total', COUNT(*),
                        'correct', COUNT(CASE WHEN confirmed = (trend_status IN ('approved', 'viral')) THEN 1 END),
                        'accuracy', CASE 
                            WHEN COUNT(*) > 0 THEN 
                                ROUND((COUNT(CASE WHEN confirmed = (trend_status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)::NUMERIC, 2)
                            ELSE 0 
                        END
                    ) as category_stats
                FROM validation_stats
                WHERE trend_status IN ('approved', 'rejected', 'viral')
                GROUP BY category
            ) cat_stats
        ) as category_expertise,
        CASE 
            WHEN COUNT(*) >= 1000 AND 
                 COUNT(CASE WHEN vs.confirmed = (vs.trend_status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)::DECIMAL > 0.85 
            THEN 'expert'
            WHEN COUNT(*) >= 500 AND 
                 COUNT(CASE WHEN vs.confirmed = (vs.trend_status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)::DECIMAL > 0.75 
            THEN 'advanced'
            WHEN COUNT(*) >= 100 AND 
                 COUNT(CASE WHEN vs.confirmed = (vs.trend_status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)::DECIMAL > 0.65 
            THEN 'intermediate'
            WHEN COUNT(*) >= 10 THEN 'beginner'
            ELSE 'novice'
        END as validator_rank,
        COALESCE((SELECT max_streak FROM streak_calc), 0)::INTEGER as streak_days
    FROM validation_stats vs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_trends_to_verify_enhanced(UUID, INTEGER, trend_category[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_verification_stats_enhanced(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_validation_earnings(UUID, UUID, BOOLEAN, DECIMAL) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_date ON public.trend_validations(validator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status_created ON public.trend_submissions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_validator_performance_validator_period ON public.validator_performance(validator_id, period_start, period_end);

-- Add RLS policies for new tables
ALTER TABLE public.validation_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validator_performance ENABLE ROW LEVEL SECURITY;

-- Policies for validation_thresholds (read-only for authenticated users)
CREATE POLICY "Anyone can read validation thresholds" ON public.validation_thresholds
    FOR SELECT USING (TRUE);

-- Policies for earnings_config (read-only for authenticated users)
CREATE POLICY "Anyone can read earnings config" ON public.earnings_config
    FOR SELECT USING (TRUE);

-- Policies for validator_performance
CREATE POLICY "Users can view their own performance" ON public.validator_performance
    FOR SELECT USING (auth.uid() = validator_id);

CREATE POLICY "System can insert performance records" ON public.validator_performance
    FOR INSERT WITH CHECK (TRUE);

-- Create a scheduled function to update validator performance (to be called by a cron job)
CREATE OR REPLACE FUNCTION public.update_validator_performance_metrics()
RETURNS void AS $$
BEGIN
    -- Insert or update daily performance metrics
    INSERT INTO validator_performance (
        validator_id,
        period_start,
        period_end,
        total_validations,
        accurate_validations,
        accuracy_rate,
        earnings_total,
        average_confidence,
        categories_validated
    )
    SELECT 
        tv.validator_id,
        CURRENT_DATE as period_start,
        CURRENT_DATE as period_end,
        COUNT(*) as total_validations,
        COUNT(CASE WHEN tv.confirmed = (ts.status IN ('approved', 'viral')) THEN 1 END) as accurate_validations,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN tv.confirmed = (ts.status IN ('approved', 'viral')) THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL)::DECIMAL(3,2)
            ELSE 0::DECIMAL(3,2)
        END as accuracy_rate,
        SUM(tv.reward_amount) as earnings_total,
        AVG(tv.confidence_score)::DECIMAL(3,2) as average_confidence,
        jsonb_object_agg(ts.category, category_count) as categories_validated
    FROM trend_validations tv
    JOIN trend_submissions ts ON tv.trend_id = ts.id
    WHERE DATE(tv.created_at) = CURRENT_DATE
    GROUP BY tv.validator_id
    ON CONFLICT (validator_id, period_start, period_end) 
    DO UPDATE SET
        total_validations = EXCLUDED.total_validations,
        accurate_validations = EXCLUDED.accurate_validations,
        accuracy_rate = EXCLUDED.accuracy_rate,
        earnings_total = EXCLUDED.earnings_total,
        average_confidence = EXCLUDED.average_confidence,
        categories_validated = EXCLUDED.categories_validated;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_validator_performance_metrics() TO authenticated;