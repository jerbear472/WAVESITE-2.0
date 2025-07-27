-- Add the missing Lifestyle category (exactly as the form sends it)
ALTER TYPE trend_category ADD VALUE 'Lifestyle';

-- Also add lowercase version just in case
ALTER TYPE trend_category ADD VALUE 'lifestyle';

-- Show all categories after adding
SELECT enumlabel as category 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_category')
ORDER BY enumlabel;