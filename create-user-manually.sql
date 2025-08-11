-- ============================================
-- CREATE USER MANUALLY (Workaround)
-- Use this while email is restricted
-- ============================================

-- Step 1: Create auth user directly (run in SQL editor)
-- Note: You'll need to use Supabase Dashboard or the service role key for this

-- Step 2: Create user profile manually
INSERT INTO user_profiles (
    id,
    email,
    username,
    role,
    spotter_tier,
    earnings_pending,
    earnings_approved,
    earnings_paid,
    total_earnings,
    trends_spotted,
    accuracy_score,
    validation_score,
    current_streak,
    demographics,
    interests,
    created_at,
    updated_at,
    is_active
) VALUES (
    gen_random_uuid(), -- Generate a new UUID
    'testuser@wavesight.com', -- Your test email
    'testuser', -- Username
    'participant',
    'learning',
    0.00,
    0.00,
    0.00,
    0.00,
    0,
    0.00,
    0.00,
    0,
    '{}',
    '{}',
    NOW(),
    NOW(),
    true
) ON CONFLICT (email) DO NOTHING
RETURNING *;

-- This creates a profile, but without auth you can't log in
-- For full testing, you need to fix the email restriction