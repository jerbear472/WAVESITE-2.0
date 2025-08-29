-- SIMPLE VERSION - Just create the table
-- Copy and paste this into Supabase SQL Editor and click RUN

CREATE TABLE public.trend_user_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    trend_id UUID REFERENCES public.trend_submissions(id),
    vote_type TEXT CHECK (vote_type IN ('wave', 'fire', 'declining', 'dead')),
    vote_value INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, trend_id)
);

-- Enable RLS
ALTER TABLE public.trend_user_votes ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read
CREATE POLICY "read_all_votes" ON public.trend_user_votes
FOR SELECT USING (true);

-- Allow users to manage their own votes
CREATE POLICY "users_manage_own_votes" ON public.trend_user_votes
FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.trend_user_votes TO authenticated;
GRANT SELECT ON public.trend_user_votes TO anon;