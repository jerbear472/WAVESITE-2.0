-- QUICK FIX: Remove or update constraints blocking our values

-- Drop all existing check constraints on the new columns
ALTER TABLE trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_trend_velocity_check,
DROP CONSTRAINT IF EXISTS trend_submissions_trend_size_check,
DROP CONSTRAINT IF EXISTS trend_submissions_ai_angle_check;

-- Option 1: No constraints (most flexible)
-- Just run the above DROP commands and stop here

-- Option 2: Add back constraints with our values
-- Add constraints that match our frontend values
ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_trend_velocity_check 
CHECK (
    trend_velocity IS NULL OR 
    trend_velocity IN (
        'just_starting', 
        'picking_up', 
        'viral', 
        'saturated', 
        'declining'
    )
);

ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_trend_size_check 
CHECK (
    trend_size IS NULL OR 
    trend_size IN (
        'micro', 
        'niche', 
        'viral', 
        'mega', 
        'global'
    )
);

ALTER TABLE trend_submissions 
ADD CONSTRAINT trend_submissions_ai_angle_check 
CHECK (
    ai_angle IS NULL OR 
    ai_angle IN (
        'using_ai',
        'reacting_to_ai', 
        'ai_tool_viral',
        'ai_technique',
        'anti_ai',
        'not_ai'
    )
);