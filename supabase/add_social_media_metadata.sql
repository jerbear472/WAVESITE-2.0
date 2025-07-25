-- Add social media metadata columns to trend_submissions table
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- Add index for creator handle searches
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);

-- Add index for hashtags (GIN index for array search)
CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);

-- Update RLS policies to include new fields
-- Policy already exists for viewing approved trends and own submissions

-- Create a view for public trends with user information
CREATE OR REPLACE VIEW public.public_trends AS
SELECT 
    ts.id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.post_url,
    ts.virality_prediction,
    ts.quality_score,
    ts.created_at,
    ts.posted_at,
    up.username as spotter_username,
    up.id as spotter_id
FROM public.trend_submissions ts
JOIN public.user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('approved', 'viral', 'validating')
ORDER BY ts.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.public_trends TO authenticated;
GRANT SELECT ON public.public_trends TO anon;

-- Create function to get user's timeline with full metadata
CREATE OR REPLACE FUNCTION public.get_user_timeline(user_id UUID)
RETURNS TABLE (
    id UUID,
    category trend_category,
    description TEXT,
    screenshot_url TEXT,
    thumbnail_url TEXT,
    creator_handle TEXT,
    creator_name TEXT,
    post_caption TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    shares_count INTEGER,
    views_count INTEGER,
    hashtags TEXT[],
    post_url TEXT,
    virality_prediction INTEGER,
    quality_score DECIMAL(3,2),
    status trend_status,
    created_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.category,
        ts.description,
        ts.screenshot_url,
        ts.thumbnail_url,
        ts.creator_handle,
        ts.creator_name,
        ts.post_caption,
        ts.likes_count,
        ts.comments_count,
        ts.shares_count,
        ts.views_count,
        ts.hashtags,
        ts.post_url,
        ts.virality_prediction,
        ts.quality_score,
        ts.status,
        ts.created_at,
        ts.posted_at
    FROM public.trend_submissions ts
    WHERE ts.spotter_id = user_id
    ORDER BY ts.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_timeline(UUID) TO authenticated;