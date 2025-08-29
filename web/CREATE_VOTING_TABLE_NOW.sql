-- URGENT: Create the missing trend_user_votes table
-- Run this in Supabase SQL Editor immediately

-- Create the table
CREATE TABLE IF NOT EXISTS public.trend_user_votes (
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
CREATE INDEX IF NOT EXISTS idx_trend_user_votes_user_id ON public.trend_user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_user_votes_trend_id ON public.trend_user_votes(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_user_votes_vote_type ON public.trend_user_votes(vote_type);

-- Enable RLS
ALTER TABLE public.trend_user_votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view votes" 
ON public.trend_user_votes FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own votes" 
ON public.trend_user_votes FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.trend_user_votes TO authenticated;
GRANT SELECT ON public.trend_user_votes TO anon;

-- Add vote count columns to trend_submissions if they don't exist
DO $$ 
BEGIN
    -- Check and add wave_votes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'wave_votes') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN wave_votes INTEGER DEFAULT 0;
    END IF;
    
    -- Check and add fire_votes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'fire_votes') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN fire_votes INTEGER DEFAULT 0;
    END IF;
    
    -- Check and add declining_votes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'declining_votes') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN declining_votes INTEGER DEFAULT 0;
    END IF;
    
    -- Check and add dead_votes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'dead_votes') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN dead_votes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to update vote counts
CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the vote counts on the trend_submissions table
    UPDATE public.trend_submissions
    SET 
        wave_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'wave'),
        fire_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'fire'),
        declining_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'declining'),
        dead_votes = (SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id) AND vote_type = 'dead')
    WHERE id = COALESCE(NEW.trend_id, OLD.trend_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update counts
DROP TRIGGER IF EXISTS update_trend_votes_trigger ON public.trend_user_votes;
CREATE TRIGGER update_trend_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.trend_user_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- Verify the table was created
SELECT 
    'SUCCESS: Table created!' as status,
    COUNT(*) as column_count,
    string_agg(column_name, ', ') as columns
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'trend_user_votes'
GROUP BY 
    table_schema, table_name;