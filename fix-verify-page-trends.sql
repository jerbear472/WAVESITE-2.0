-- Fix script to ensure trends appear on the verify page

-- 1. Check current status of trends
SELECT 
    COUNT(*) as total_trends,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_status,
    COUNT(CASE WHEN validation_status = 'pending' THEN 1 END) as pending_validation,
    COUNT(CASE WHEN validation_status IS NULL THEN 1 END) as null_validation,
    COUNT(CASE WHEN validation_count = 0 THEN 1 END) as zero_validations
FROM trend_submissions
WHERE created_at > NOW() - INTERVAL '7 days';

-- 2. Add validation_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
        AND column_name = 'validation_status'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN validation_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added validation_status column';
    END IF;
END $$;

-- 3. Add validation_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
        AND column_name = 'validation_count'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN validation_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added validation_count column';
    END IF;
END $$;

-- 4. Update trends that should be available for validation
-- Set validation_status to 'pending' for trends that haven't been validated yet
UPDATE trend_submissions
SET validation_status = 'pending'
WHERE validation_status IS NULL
  AND (status = 'submitted' OR status = 'validating' OR validation_count = 0)
  AND created_at > NOW() - INTERVAL '30 days';

-- 5. Fix any trends with null validation_count
UPDATE trend_submissions
SET validation_count = 0
WHERE validation_count IS NULL;

-- 6. Ensure new trends get proper defaults
ALTER TABLE trend_submissions 
ALTER COLUMN validation_status SET DEFAULT 'pending';

ALTER TABLE trend_submissions 
ALTER COLUMN validation_count SET DEFAULT 0;

-- 7. Count how many trends should now be available for validation
SELECT 
    'Trends available for validation:' as info,
    COUNT(*) as count
FROM trend_submissions
WHERE (
    status = 'submitted' 
    OR status = 'validating'
    OR validation_status = 'pending' 
    OR validation_status IS NULL 
    OR validation_count = 0
)
AND created_at > NOW() - INTERVAL '7 days';

-- 8. Show sample of trends that should appear
SELECT 
    id,
    description,
    status,
    validation_status,
    validation_count,
    created_at
FROM trend_submissions
WHERE (
    status = 'submitted' 
    OR status = 'validating'
    OR validation_status = 'pending' 
    OR validation_status IS NULL 
    OR validation_count = 0
)
ORDER BY created_at DESC
LIMIT 5;

-- 9. Grant necessary permissions
GRANT SELECT ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_validations TO authenticated;
GRANT INSERT ON public.trend_validations TO authenticated;

-- 10. Create or replace function to ensure trends are properly initialized on insert
CREATE OR REPLACE FUNCTION initialize_trend_validation_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure validation fields are set
    IF NEW.validation_status IS NULL THEN
        NEW.validation_status := 'pending';
    END IF;
    
    IF NEW.validation_count IS NULL THEN
        NEW.validation_count := 0;
    END IF;
    
    IF NEW.approve_count IS NULL THEN
        NEW.approve_count := 0;
    END IF;
    
    IF NEW.reject_count IS NULL THEN
        NEW.reject_count := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to initialize validation fields
DROP TRIGGER IF EXISTS initialize_trend_validation ON public.trend_submissions;
CREATE TRIGGER initialize_trend_validation
    BEFORE INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION initialize_trend_validation_fields();

-- Summary
DO $$
DECLARE
    v_available_count INTEGER;
    v_recent_count INTEGER;
BEGIN
    -- Count available trends
    SELECT COUNT(*) INTO v_available_count
    FROM trend_submissions
    WHERE (
        status = 'submitted' 
        OR status = 'validating'
        OR validation_status = 'pending' 
        OR validation_status IS NULL 
        OR validation_count = 0
    );
    
    -- Count recent trends (last 24 hours)
    SELECT COUNT(*) INTO v_recent_count
    FROM trend_submissions
    WHERE created_at > NOW() - INTERVAL '24 hours';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Verify Page Fix Complete ===';
    RAISE NOTICE 'Total trends available for validation: %', v_available_count;
    RAISE NOTICE 'Trends submitted in last 24 hours: %', v_recent_count;
    RAISE NOTICE '';
    RAISE NOTICE 'The verify page should now show trends that:';
    RAISE NOTICE '  - Have status = submitted';
    RAISE NOTICE '  - Have validation_status = pending';
    RAISE NOTICE '  - Have validation_count = 0';
    RAISE NOTICE '  - Are not from the current user';
END $$;