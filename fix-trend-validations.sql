-- Ensure trend_validations table has all necessary columns
ALTER TABLE public.trend_validations 
ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0.5;

-- Ensure proper RLS policies
DROP POLICY IF EXISTS "Users can view validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Authenticated users can validate trends" ON public.trend_validations;
DROP POLICY IF EXISTS "Trend validations are viewable by everyone" ON public.trend_validations;

-- Create comprehensive policies
CREATE POLICY "Anyone can view validations" ON public.trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert validations" ON public.trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users can update their own validations" ON public.trend_validations
    FOR UPDATE USING (auth.uid() = validator_id);

-- Grant necessary permissions
GRANT SELECT ON public.trend_validations TO anon;
GRANT ALL ON public.trend_validations TO authenticated;

-- Create or replace function to automatically update trend status based on validations
CREATE OR REPLACE FUNCTION update_trend_status_on_validation()
RETURNS TRIGGER AS $$
DECLARE
    positive_count INTEGER;
    negative_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Count validations for this trend
    SELECT 
        COUNT(*) FILTER (WHERE confirmed = true),
        COUNT(*) FILTER (WHERE confirmed = false),
        COUNT(*)
    INTO positive_count, negative_count, total_count
    FROM public.trend_validations
    WHERE trend_id = NEW.trend_id;

    -- Update the trend submission
    UPDATE public.trend_submissions
    SET 
        validation_count = total_count,
        status = CASE
            WHEN total_count >= 5 AND positive_count > negative_count * 2 THEN 'approved'
            WHEN total_count >= 5 AND negative_count > positive_count * 2 THEN 'rejected'
            WHEN total_count > 0 THEN 'validating'
            ELSE status
        END,
        quality_score = CASE 
            WHEN total_count > 0 THEN positive_count::float / total_count::float
            ELSE quality_score
        END
    WHERE id = NEW.trend_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_trend_on_validation ON public.trend_validations;
CREATE TRIGGER update_trend_on_validation
    AFTER INSERT OR UPDATE ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_trend_status_on_validation();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON public.trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id ON public.trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_created_at ON public.trend_validations(created_at DESC);

-- Test by checking if we can select from the table
SELECT COUNT(*) as validation_count FROM public.trend_validations;