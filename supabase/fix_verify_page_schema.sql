-- Fix schema for verify page functionality

-- Add platform column to trend_submissions if it doesn't exist
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Create a view for users that matches what the verify page expects
CREATE OR REPLACE VIEW public.users AS
SELECT 
    id,
    username,
    email,
    role,
    created_at
FROM public.user_profiles;

-- Grant access to the users view
GRANT SELECT ON public.users TO authenticated;

-- Update the trend_validations table to include confidence_score if missing
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.50;

-- Ensure proper RLS policies for viewing all trends for verification
DROP POLICY IF EXISTS "Authenticated users can view trends for verification" ON public.trend_submissions;
CREATE POLICY "Authenticated users can view trends for verification" ON public.trend_submissions
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            status IN ('submitted', 'validating') OR
            spotter_id = auth.uid() OR
            status IN ('approved', 'viral')
        )
    );

-- Update the admin setup to ensure admin can see all trends
DROP POLICY IF EXISTS "Admins can view all trends" ON public.trend_submissions;
CREATE POLICY "Admins can view all trends" ON public.trend_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create a function to get trends for verification
CREATE OR REPLACE FUNCTION public.get_trends_to_verify(user_uuid UUID, limit_count INTEGER DEFAULT 20)
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
    status trend_status,
    spotter_username TEXT,
    spotter_email TEXT
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
        ts.status,
        up.username as spotter_username,
        up.email as spotter_email
    FROM public.trend_submissions ts
    LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id
    WHERE ts.spotter_id != user_uuid
    AND ts.status IN ('submitted', 'validating')
    AND NOT EXISTS (
        SELECT 1 FROM public.trend_validations tv
        WHERE tv.trend_id = ts.id
        AND tv.validator_id = user_uuid
    )
    ORDER BY ts.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_trends_to_verify(UUID, INTEGER) TO authenticated;

-- Create a function to get user verification stats
CREATE OR REPLACE FUNCTION public.get_user_verification_stats(user_uuid UUID)
RETURNS TABLE (
    verified_today INTEGER,
    earnings_today DECIMAL(10,2),
    accuracy_score DECIMAL(3,2),
    total_verifications INTEGER,
    correct_verifications INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN DATE(tv.created_at) = CURRENT_DATE THEN 1 END)::INTEGER as verified_today,
        SUM(CASE WHEN DATE(tv.created_at) = CURRENT_DATE THEN tv.reward_amount ELSE 0 END)::DECIMAL(10,2) as earnings_today,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN tv.confirmed = ts.status IN ('approved', 'viral') THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)::DECIMAL(3,2)
            ELSE 0::DECIMAL(3,2)
        END as accuracy_score,
        COUNT(*)::INTEGER as total_verifications,
        COUNT(CASE WHEN tv.confirmed = ts.status IN ('approved', 'viral') THEN 1 END)::INTEGER as correct_verifications
    FROM public.trend_validations tv
    LEFT JOIN public.trend_submissions ts ON tv.trend_id = ts.id
    WHERE tv.validator_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_verification_stats(UUID) TO authenticated;

-- Add some test data for development
-- Only run this in development environments
DO $$
BEGIN
    -- Check if we're in a development environment (no real trends exist)
    IF NOT EXISTS (SELECT 1 FROM public.trend_submissions WHERE status != 'submitted' LIMIT 1) THEN
        -- Insert some test trends for verification
        INSERT INTO public.trend_submissions (
            spotter_id,
            category,
            description,
            screenshot_url,
            thumbnail_url,
            creator_handle,
            creator_name,
            post_caption,
            likes_count,
            comments_count,
            shares_count,
            views_count,
            hashtags,
            platform,
            status,
            validation_count,
            created_at
        )
        SELECT
            (SELECT id FROM public.user_profiles ORDER BY RANDOM() LIMIT 1),
            (ARRAY['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern']::trend_category[])[FLOOR(RANDOM() * 6 + 1)],
            'Test Trend #' || generate_series || ': ' || (ARRAY['Dancing with props', 'New filter effect', 'Viral sound remix', 'Comedy skit format', 'Product placement', 'Challenge trend'])[FLOOR(RANDOM() * 6 + 1)],
            'https://picsum.photos/400/600?random=' || generate_series,
            'https://picsum.photos/200/300?random=' || generate_series,
            '@creator' || generate_series,
            'Creator Name ' || generate_series,
            'Check out this amazing trend! #viral #trending',
            FLOOR(RANDOM() * 100000 + 1000)::INTEGER,
            FLOOR(RANDOM() * 10000 + 100)::INTEGER,
            FLOOR(RANDOM() * 5000 + 50)::INTEGER,
            FLOOR(RANDOM() * 500000 + 10000)::INTEGER,
            ARRAY['viral', 'trending', 'fyp', 'trend' || generate_series],
            (ARRAY['TikTok', 'Instagram', 'YouTube'])[FLOOR(RANDOM() * 3 + 1)],
            'submitted',
            0,
            NOW() - (generate_series || ' hours')::INTERVAL
        FROM generate_series(1, 10)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;