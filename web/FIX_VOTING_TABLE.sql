-- Drop and recreate the trend_user_votes table with proper structure
DROP TABLE IF EXISTS public.trend_user_votes CASCADE;

-- Create the table
CREATE TABLE public.trend_user_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trend_id UUID NOT NULL REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('wave', 'fire', 'declining', 'dead')),
    vote_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, trend_id)
);

-- Create indexes for performance
CREATE INDEX idx_trend_user_votes_user_id ON public.trend_user_votes(user_id);
CREATE INDEX idx_trend_user_votes_trend_id ON public.trend_user_votes(trend_id);
CREATE INDEX idx_trend_user_votes_vote_type ON public.trend_user_votes(vote_type);
CREATE INDEX idx_trend_user_votes_created_at ON public.trend_user_votes(created_at DESC);

-- Enable RLS
ALTER TABLE public.trend_user_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all votes" ON public.trend_user_votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.trend_user_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.trend_user_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.trend_user_votes;

-- Create RLS policies
CREATE POLICY "Users can view all votes" 
ON public.trend_user_votes FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own votes" 
ON public.trend_user_votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" 
ON public.trend_user_votes FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" 
ON public.trend_user_votes FOR DELETE 
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.trend_user_votes TO authenticated;
GRANT SELECT ON public.trend_user_votes TO anon;

-- Create or replace function to update vote counts on trend_submissions
CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the vote counts on the trend_submissions table
    UPDATE public.trend_submissions
    SET 
        wave_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'wave'),
        fire_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'fire'),
        declining_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'declining'),
        dead_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'dead'),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.trend_id, OLD.trend_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update counts
DROP TRIGGER IF EXISTS update_trend_votes_trigger ON public.trend_user_votes;
CREATE TRIGGER update_trend_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.trend_user_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- Add vote count columns to trend_submissions if they don't exist
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS wave_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fire_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS declining_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dead_votes INTEGER DEFAULT 0;

-- Test insert to verify it works
-- This will be rolled back, just for testing
DO $$
DECLARE
    test_user_id UUID;
    test_trend_id UUID;
BEGIN
    -- Get a test user and trend
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    SELECT id INTO test_trend_id FROM public.trend_submissions LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_trend_id IS NOT NULL THEN
        -- Try to insert a test vote
        INSERT INTO public.trend_user_votes (user_id, trend_id, vote_type, vote_value)
        VALUES (test_user_id, test_trend_id, 'wave', 2)
        ON CONFLICT (user_id, trend_id) 
        DO UPDATE SET vote_type = 'wave', vote_value = 2, updated_at = NOW();
        
        -- Check if it worked
        RAISE NOTICE 'Test vote inserted successfully';
        
        -- Clean up test
        DELETE FROM public.trend_user_votes 
        WHERE user_id = test_user_id AND trend_id = test_trend_id;
    ELSE
        RAISE NOTICE 'No test data available';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    'Table created successfully' as status,
    COUNT(*) as column_count
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'trend_user_votes';