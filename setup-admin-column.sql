-- Add is_admin column to profiles table if it doesn't exist

-- Check if column exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_admin column to profiles table';
    ELSE
        RAISE NOTICE 'is_admin column already exists';
    END IF;
END $$;

-- Set your admin user(s)
UPDATE profiles 
SET is_admin = true 
WHERE email = 'jeremyuys@gmail.com';

-- Verify the change
SELECT id, username, email, is_admin 
FROM profiles 
WHERE is_admin = true;