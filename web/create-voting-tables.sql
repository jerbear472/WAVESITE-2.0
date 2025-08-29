-- Create trend_user_votes table for tracking individual user votes
CREATE TABLE IF NOT EXISTS public.trend_user_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trend_id UUID NOT NULL REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('wave', 'fire', 'declining', 'dead')),
    vote_value INTEGER NOT NULL CHECK (vote_value IN (-2, -1, 1, 2)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one vote per user per trend
    UNIQUE(user_id, trend_id)
);

-- Create indexes for performance
CREATE INDEX idx_trend_user_votes_user_id ON public.trend_user_votes(user_id);
CREATE INDEX idx_trend_user_votes_trend_id ON public.trend_user_votes(trend_id);
CREATE INDEX idx_trend_user_votes_vote_type ON public.trend_user_votes(vote_type);

-- Add vote count columns to trend_submissions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'wave_votes') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN wave_votes INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'fire_votes') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN fire_votes INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'declining_votes') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN declining_votes INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'dead_votes') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN dead_votes INTEGER DEFAULT 0;
    END IF;
    
    -- Add wave_score column for aggregate sentiment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'wave_score') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN wave_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- Function to update vote counts when a vote is inserted/updated/deleted
CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- If deleting, use OLD record
    IF TG_OP = 'DELETE' THEN
        -- Decrease the count for the old vote type
        EXECUTE format('UPDATE trend_submissions SET %I = GREATEST(0, %I - 1) WHERE id = $1', 
                      OLD.vote_type || '_votes', OLD.vote_type || '_votes')
        USING OLD.trend_id;
        
        -- Update wave score
        UPDATE trend_submissions 
        SET wave_score = (wave_votes * 2) + (fire_votes * 1) - (declining_votes * 1) - (dead_votes * 2)
        WHERE id = OLD.trend_id;
        
        RETURN OLD;
    END IF;
    
    -- If updating and vote type changed
    IF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
        -- Decrease old vote type count
        EXECUTE format('UPDATE trend_submissions SET %I = GREATEST(0, %I - 1) WHERE id = $1', 
                      OLD.vote_type || '_votes', OLD.vote_type || '_votes')
        USING OLD.trend_id;
        
        -- Increase new vote type count
        EXECUTE format('UPDATE trend_submissions SET %I = %I + 1 WHERE id = $1', 
                      NEW.vote_type || '_votes', NEW.vote_type || '_votes')
        USING NEW.trend_id;
        
        -- Update wave score
        UPDATE trend_submissions 
        SET wave_score = (wave_votes * 2) + (fire_votes * 1) - (declining_votes * 1) - (dead_votes * 2)
        WHERE id = NEW.trend_id;
        
        RETURN NEW;
    END IF;
    
    -- If inserting
    IF TG_OP = 'INSERT' THEN
        -- Increase the count for the new vote type
        EXECUTE format('UPDATE trend_submissions SET %I = %I + 1 WHERE id = $1', 
                      NEW.vote_type || '_votes', NEW.vote_type || '_votes')
        USING NEW.trend_id;
        
        -- Update wave score
        UPDATE trend_submissions 
        SET wave_score = (wave_votes * 2) + (fire_votes * 1) - (declining_votes * 1) - (dead_votes * 2)
        WHERE id = NEW.trend_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic vote count updates
DROP TRIGGER IF EXISTS update_trend_votes_trigger ON public.trend_user_votes;
CREATE TRIGGER update_trend_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.trend_user_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_vote_counts();

-- Enable RLS
ALTER TABLE public.trend_user_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all votes
CREATE POLICY "Users can view all votes" ON public.trend_user_votes
    FOR SELECT
    USING (true);

-- Policy: Users can insert their own votes
CREATE POLICY "Users can insert their own votes" ON public.trend_user_votes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own votes
CREATE POLICY "Users can update their own votes" ON public.trend_user_votes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own votes
CREATE POLICY "Users can delete their own votes" ON public.trend_user_votes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.trend_user_votes TO authenticated;
GRANT SELECT ON public.trend_user_votes TO anon;

-- Update existing trends to calculate initial vote counts (if any votes exist)
UPDATE public.trend_submissions ts
SET 
    wave_votes = COALESCE((SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = ts.id AND vote_type = 'wave'), 0),
    fire_votes = COALESCE((SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = ts.id AND vote_type = 'fire'), 0),
    declining_votes = COALESCE((SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = ts.id AND vote_type = 'declining'), 0),
    dead_votes = COALESCE((SELECT COUNT(*) FROM public.trend_user_votes WHERE trend_id = ts.id AND vote_type = 'dead'), 0);

-- Update wave scores
UPDATE public.trend_submissions 
SET wave_score = (wave_votes * 2) + (fire_votes * 1) - (declining_votes * 1) - (dead_votes * 2);