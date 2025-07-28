-- Fix the default status value for trend_submissions
-- Change from 'pending' to 'submitted'

-- First, check current default
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'trend_submissions' 
AND column_name = 'status';

-- Update the default value
ALTER TABLE public.trend_submissions 
ALTER COLUMN status SET DEFAULT 'submitted';

-- Verify the change
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'trend_submissions' 
AND column_name = 'status';

-- Also ensure 'pending' is a valid value if it's not already
-- (in case we need backward compatibility)
DO $$
BEGIN
    -- Check if 'pending' exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'pending' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status')
    ) THEN
        -- Add 'pending' to the enum for backward compatibility
        ALTER TYPE trend_status ADD VALUE IF NOT EXISTS 'pending';
    END IF;
END $$;