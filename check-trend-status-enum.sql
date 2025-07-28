-- Check what values are in the trend_status enum
SELECT enumlabel as valid_status_values
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status')
ORDER BY enumsortorder;

-- If 'pending' is in the enum but shouldn't be, remove it
-- First, check if any rows use 'pending'
SELECT COUNT(*) as pending_count
FROM trend_submissions
WHERE status = 'pending';

-- If the above returns 0, we can safely remove 'pending' from the enum
-- This is complex, so only run if needed:
/*
-- Step 1: Create new enum without 'pending'
CREATE TYPE trend_status_new AS ENUM ('submitted', 'validating', 'approved', 'rejected', 'viral');

-- Step 2: Alter column to use new enum
ALTER TABLE trend_submissions 
  ALTER COLUMN status TYPE trend_status_new 
  USING status::text::trend_status_new;

-- Step 3: Drop old enum
DROP TYPE trend_status;

-- Step 4: Rename new enum
ALTER TYPE trend_status_new RENAME TO trend_status;
*/