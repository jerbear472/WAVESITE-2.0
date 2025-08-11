-- ============================================
-- SIMPLE FIX - Run each command one by one
-- Copy and paste each command separately
-- ============================================

-- 1. First check what exists
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Check if profiles is a view
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';

-- 3. Drop the profiles view if it exists
DROP VIEW IF EXISTS profiles;

-- 4. Add missing columns to user_profiles (run each separately)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00;

-- 5. Recreate the profiles view
CREATE VIEW profiles AS SELECT * FROM user_profiles;

-- 6. Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- 7. Fix trend_submissions columns
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2) DEFAULT 1.00;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00;

-- 8. Test if it worked
SELECT 'SUCCESS!' as status;