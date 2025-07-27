-- Add updated_at column to trend_submissions table
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row update
DROP TRIGGER IF EXISTS update_trend_submissions_updated_at ON public.trend_submissions;
CREATE TRIGGER update_trend_submissions_updated_at
    BEFORE UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();