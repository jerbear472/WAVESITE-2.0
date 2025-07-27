-- Add admin role and permissions to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'enterprise')),
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_manage_users": false, "can_switch_views": false, "can_access_all_data": false}'::jsonb;

-- Create admin users table for detailed admin management
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{
        "can_manage_users": true,
        "can_switch_views": true,
        "can_access_all_data": true,
        "can_manage_permissions": true,
        "can_view_analytics": true,
        "can_export_data": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user account settings table
CREATE TABLE IF NOT EXISTS user_account_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type TEXT NOT NULL DEFAULT 'user' CHECK (account_type IN ('user', 'enterprise')),
    enterprise_features JSONB DEFAULT '{
        "advanced_analytics": false,
        "data_export": false,
        "api_access": false,
        "team_collaboration": false,
        "custom_branding": false,
        "priority_support": false
    }'::jsonb,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make jeremyuys@gmail.com an admin
INSERT INTO admin_users (id, email)
SELECT id, email FROM auth.users WHERE email = 'jeremyuys@gmail.com'
ON CONFLICT (email) DO NOTHING;

-- Update profiles to mark admin
UPDATE profiles 
SET is_admin = TRUE,
    permissions = '{
        "can_manage_users": true,
        "can_switch_views": true,
        "can_access_all_data": true,
        "can_manage_permissions": true
    }'::jsonb
WHERE email = 'jeremyuys@gmail.com';

-- Create RLS policies for admin_users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin users" ON admin_users
    FOR SELECT
    USING (
        auth.uid() IN (SELECT id FROM admin_users)
    );

CREATE POLICY "Admins can manage admin users" ON admin_users
    FOR ALL
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE (permissions->>'can_manage_permissions')::boolean = true)
    );

-- Create RLS policies for user_account_settings
ALTER TABLE user_account_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON user_account_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all settings" ON user_account_settings
    FOR SELECT
    USING (
        auth.uid() IN (SELECT id FROM admin_users)
    );

CREATE POLICY "Admins can manage all settings" ON user_account_settings
    FOR ALL
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE (permissions->>'can_manage_users')::boolean = true)
    );

-- Create function to toggle user account type
CREATE OR REPLACE FUNCTION toggle_user_account_type(
    p_user_id UUID,
    p_account_type TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Check if the caller is an admin
    IF NOT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() 
        AND (permissions->>'can_manage_users')::boolean = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can change account types';
    END IF;

    -- Update or insert account settings
    INSERT INTO user_account_settings (user_id, account_type)
    VALUES (p_user_id, p_account_type)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        account_type = p_account_type,
        updated_at = NOW();

    -- Update profile subscription tier based on account type
    UPDATE profiles
    SET subscription_tier = CASE 
        WHEN p_account_type = 'enterprise' THEN 'enterprise'
        ELSE 'starter'
    END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for admin dashboard
CREATE OR REPLACE VIEW admin_user_management AS
SELECT 
    p.id,
    p.email,
    p.username,
    p.subscription_tier,
    COALESCE(uas.account_type, 'user') as account_type,
    uas.enterprise_features,
    uas.subscription_status,
    p.created_at,
    p.is_admin,
    p.total_earnings,
    p.trends_spotted,
    p.accuracy_score
FROM profiles p
LEFT JOIN user_account_settings uas ON p.id = uas.user_id
ORDER BY p.created_at DESC;

-- Grant access to the view
GRANT SELECT ON admin_user_management TO authenticated;