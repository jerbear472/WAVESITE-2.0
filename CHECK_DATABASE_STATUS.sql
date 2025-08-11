-- Run this to check your database status

SELECT 
    'Tables Check' as check_type,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') as user_profiles_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_submissions') as trends_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_validations') as validations_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger') as ledger_exists;

SELECT 
    'View Check' as check_type,
    EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'profiles') as profiles_view_exists;

SELECT 
    'Function Check' as check_type,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cast_trend_vote') as vote_function_exists;

SELECT 
    'Columns Check - user_profiles' as check_type,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'earnings_pending') as has_earnings;

SELECT 
    'Columns Check - trend_submissions' as check_type,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'total_earned') as has_earnings;