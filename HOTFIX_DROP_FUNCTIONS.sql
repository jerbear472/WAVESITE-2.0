-- HOTFIX: Drop existing functions that conflict with new migration
-- Run this first if you get "cannot change return type" errors

DROP FUNCTION IF EXISTS get_user_earnings_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_rejection() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS calculate_trend_earnings_trigger ON captured_trends;
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON trend_validations;
DROP TRIGGER IF EXISTS handle_trend_approval_trigger ON captured_trends;
DROP TRIGGER IF EXISTS handle_validation_vote_trigger ON trend_validations;

-- Now you can run the main migration: 20250114_complete_earnings_with_approval_logic.sql