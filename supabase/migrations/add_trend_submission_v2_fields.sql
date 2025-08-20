-- Migration to add new fields for enhanced trend submission form
-- Run this after backing up your database

-- Add lifecycle stage enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lifecycle_stage') THEN
        CREATE TYPE lifecycle_stage AS ENUM (
            'just_starting',
            'picking_up', 
            'going_viral',
            'declining',
            'dead'
        );
    END IF;
END$$;

-- Add trend type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trend_type') THEN
        CREATE TYPE trend_type AS ENUM (
            'visual',
            'audio',
            'concept',
            'format',
            'product',
            'finance_crypto',
            'gaming'
        );
    END IF;
END$$;

-- Add new columns to trend_submissions table
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS lifecycle_stage lifecycle_stage,
ADD COLUMN IF NOT EXISTS trend_type trend_type,
ADD COLUMN IF NOT EXISTS is_evolution BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_trends UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS peak_date DATE,
ADD COLUMN IF NOT EXISTS next_platform TEXT,
ADD COLUMN IF NOT EXISTS lifespan_value INTEGER,
ADD COLUMN IF NOT EXISTS lifespan_unit TEXT CHECK (lifespan_unit IN ('days', 'weeks', 'months')),
ADD COLUMN IF NOT EXISTS context_note TEXT,
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add constraint for context note length
ALTER TABLE public.trend_submissions 
ADD CONSTRAINT context_note_length CHECK (LENGTH(context_note) <= 280);

-- Create index for parent trends for faster lookups
CREATE INDEX IF NOT EXISTS idx_trend_submissions_parent_trends 
ON public.trend_submissions USING GIN (parent_trends);

-- Create index for lifecycle stage and trend type for filtering
CREATE INDEX IF NOT EXISTS idx_trend_submissions_lifecycle 
ON public.trend_submissions (lifecycle_stage);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_type 
ON public.trend_submissions (trend_type);

-- Add comment to explain the parent_trends field
COMMENT ON COLUMN public.trend_submissions.parent_trends IS 'Array of trend IDs that this trend evolved from';

-- Update the existing evidence JSONB column to include new structured data
-- This preserves backward compatibility while storing additional metadata
ALTER TABLE public.trend_submissions 
ALTER COLUMN evidence TYPE JSONB USING 
    CASE 
        WHEN evidence IS NULL THEN '{}'::JSONB
        ELSE evidence
    END;

-- Create a view for trend chains/evolution tracking
CREATE OR REPLACE VIEW trend_evolution_chains AS
SELECT 
    t1.id AS trend_id,
    t1.title AS trend_title,
    t1.lifecycle_stage,
    t1.trend_type,
    t2.id AS parent_id,
    t2.title AS parent_title,
    t1.created_at
FROM 
    public.trend_submissions t1
    LEFT JOIN LATERAL unnest(t1.parent_trends) AS parent_id ON true
    LEFT JOIN public.trend_submissions t2 ON t2.id = parent_id
WHERE 
    t1.is_evolution = true
ORDER BY 
    t1.created_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON trend_evolution_chains TO authenticated;
GRANT SELECT ON trend_evolution_chains TO anon;

-- Function to calculate bonus XP for trend submissions
CREATE OR REPLACE FUNCTION calculate_trend_submission_xp(
    p_is_evolution BOOLEAN,
    p_parent_count INTEGER,
    p_has_prediction BOOLEAN,
    p_has_context BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
    v_xp INTEGER := 25; -- Base XP
BEGIN
    -- Evolution tracking bonus
    IF p_is_evolution THEN
        v_xp := v_xp + 50;
        -- Chain bonus (100 XP per parent, max 500)
        v_xp := v_xp + LEAST(p_parent_count * 100, 500);
    END IF;
    
    -- Prediction bonus
    IF p_has_prediction THEN
        v_xp := v_xp + 20;
    END IF;
    
    -- Context note bonus
    IF p_has_context THEN
        v_xp := v_xp + 5;
    END IF;
    
    RETURN v_xp;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-populate title from description if not provided
CREATE OR REPLACE FUNCTION set_trend_title()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.title IS NULL OR NEW.title = '' THEN
        -- Use first 100 chars of description as title
        NEW.title := LEFT(NEW.description, 100);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_trend_title
    BEFORE INSERT OR UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION set_trend_title();

-- Add validation for parent trends to ensure they exist
CREATE OR REPLACE FUNCTION validate_parent_trends()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_trends IS NOT NULL AND array_length(NEW.parent_trends, 1) > 0 THEN
        -- Check if all parent trends exist
        IF EXISTS (
            SELECT 1 
            FROM unnest(NEW.parent_trends) AS parent_id
            WHERE NOT EXISTS (
                SELECT 1 FROM public.trend_submissions WHERE id = parent_id
            )
        ) THEN
            RAISE EXCEPTION 'One or more parent trends do not exist';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_parent_trends_trigger
    BEFORE INSERT OR UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION validate_parent_trends();

-- Update RLS policies to handle new fields
CREATE POLICY "Users can search trends for evolution linking" 
    ON public.trend_submissions
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL 
        AND (status = 'approved' OR status = 'viral' OR status = 'submitted')
    );

-- Add function to search trends for parent linking
CREATE OR REPLACE FUNCTION search_trends_for_linking(
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    trend_type trend_type,
    lifecycle_stage lifecycle_stage,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.title,
        ts.trend_type,
        ts.lifecycle_stage,
        ts.created_at
    FROM 
        public.trend_submissions ts
    WHERE 
        (ts.status = 'approved' OR ts.status = 'viral')
        AND (
            ts.title ILIKE '%' || p_query || '%'
            OR ts.description ILIKE '%' || p_query || '%'
        )
    ORDER BY 
        ts.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_trends_for_linking TO authenticated;

-- Add comment explaining the migration
COMMENT ON TABLE public.trend_submissions IS 'Enhanced trend submissions table with lifecycle tracking, evolution chains, and predictions';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully. New fields added for enhanced trend submission form.';
END$$;