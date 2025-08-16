-- =====================================================
-- CLEAN UP OLD TRIGGERS AND FUNCTIONS
-- =====================================================
-- Remove any existing triggers that might reference status
-- =====================================================

-- Drop all existing earnings-related triggers
DROP TRIGGER IF EXISTS calculate_trend_submission_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS handle_trend_submission_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS update_trend_status_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS calculate_trend_submission_earnings ON trend_submissions;
DROP TRIGGER IF EXISTS trend_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS record_earnings ON trend_submissions;

-- Drop all existing earnings-related functions
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_status_update() CASCADE;
DROP FUNCTION IF EXISTS calculate_trend_earnings_simple() CASCADE;
DROP FUNCTION IF EXISTS record_trend_earnings() CASCADE;

-- Show what triggers remain
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trend_submissions';

-- Show what columns exist
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Done
SELECT 'Old triggers cleaned up' as status;