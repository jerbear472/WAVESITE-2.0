-- Check and fix user earnings tracking

-- 1. Check if profiles table has earnings columns
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('total_earnings', 'pending_earnings', 'earnings')
ORDER BY ordinal_position;

-- 2. Add earnings columns if they don't exist
DO $$ 
BEGIN
    -- Add total_earnings column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'total_earnings') THEN
        ALTER TABLE public.profiles ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    -- Add pending_earnings column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'pending_earnings') THEN
        ALTER TABLE public.profiles ADD COLUMN pending_earnings DECIMAL(10,2) DEFAULT 0.00;
    END IF;

    -- Add trends_spotted column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'trends_spotted') THEN
        ALTER TABLE public.profiles ADD COLUMN trends_spotted INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Create a function to update earnings when a trend is submitted
CREATE OR REPLACE FUNCTION update_user_earnings_on_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's earnings and trends count
    UPDATE public.profiles
    SET 
        total_earnings = total_earnings + 0.10,
        trends_spotted = trends_spotted + 1
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically update earnings on trend submission
DROP TRIGGER IF EXISTS update_earnings_trigger ON public.trend_submissions;

CREATE TRIGGER update_earnings_trigger
AFTER INSERT ON public.trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_user_earnings_on_submission();

-- 5. Verify the setup
SELECT 
    'Profiles columns:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('total_earnings', 'pending_earnings', 'trends_spotted')
ORDER BY ordinal_position;

-- 6. Test by checking a user's current earnings
-- Replace USER_ID with an actual user ID to test
-- SELECT id, email, total_earnings, pending_earnings, trends_spotted 
-- FROM public.profiles 
-- WHERE id = 'USER_ID';

-- Success message
SELECT 'Earnings tracking is now set up! Users will automatically earn $0.10 per submission.' as result;