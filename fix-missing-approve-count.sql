-- Fix missing approve_count and reject_count columns
-- This script adds the missing validation columns to trend_submissions table

DO $$ 
BEGIN
    -- Add approve_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'approve_count'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN approve_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added approve_count column to trend_submissions';
    ELSE
        RAISE NOTICE 'approve_count column already exists';
    END IF;
    
    -- Add reject_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'reject_count'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN reject_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added reject_count column to trend_submissions';
    ELSE
        RAISE NOTICE 'reject_count column already exists';
    END IF;
    
    -- Add validation_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'validation_status'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN validation_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added validation_status column to trend_submissions';
    ELSE
        RAISE NOTICE 'validation_status column already exists';
    END IF;
END $$;

-- Update existing rows to have proper counts based on trend_validations table
UPDATE public.trend_submissions SET
    approve_count = COALESCE((
        SELECT COUNT(*) 
        FROM trend_validations 
        WHERE trend_submission_id = trend_submissions.id 
        AND vote = 'verify'
    ), 0),
    reject_count = COALESCE((
        SELECT COUNT(*) 
        FROM trend_validations 
        WHERE trend_submission_id = trend_submissions.id 
        AND vote = 'reject'
    ), 0)
WHERE approve_count IS NULL OR reject_count IS NULL OR validation_status IS NULL;

-- Update validation status based on counts
UPDATE public.trend_submissions SET
    validation_status = CASE
        WHEN approve_count >= 1 THEN 'approved'
        WHEN reject_count >= 2 THEN 'rejected'
        ELSE 'pending'
    END
WHERE validation_status = 'pending' OR validation_status IS NULL;