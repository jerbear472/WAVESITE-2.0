-- Add social media metadata columns to captured_trends table
ALTER TABLE captured_trends 
ADD COLUMN IF NOT EXISTS creator_handle VARCHAR(255),
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50), -- video, image, carousel, etc.
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER, -- for videos
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_captured_trends_creator_handle ON captured_trends(creator_handle);
CREATE INDEX IF NOT EXISTS idx_captured_trends_like_count ON captured_trends(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_captured_trends_view_count ON captured_trends(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_captured_trends_posted_at ON captured_trends(posted_at DESC);

-- Update the metadata JSONB to store additional platform-specific data
COMMENT ON COLUMN captured_trends.metadata IS 'Stores platform-specific metadata including music, effects, challenges, etc.';