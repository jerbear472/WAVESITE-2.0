-- Add client role to the existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client' AFTER 'validator';

-- Add additional fields to user_profiles for better management
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'client')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- Create admin policies
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create a function to create your admin account
CREATE OR REPLACE FUNCTION create_admin_user(
    admin_email TEXT,
    admin_password TEXT,
    admin_username TEXT
)
RETURNS JSONB AS $$
DECLARE
    new_user_id UUID;
    result JSONB;
BEGIN
    -- Create the user in auth.users
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        raw_app_meta_data,
        is_super_admin,
        role
    )
    VALUES (
        uuid_generate_v4(),
        admin_email,
        crypt(admin_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('username', admin_username),
        jsonb_build_object('provider', 'email'),
        FALSE,
        'authenticated'
    )
    RETURNING id INTO new_user_id;

    -- Update the user profile to admin
    UPDATE public.user_profiles 
    SET 
        role = 'admin',
        account_type = 'user',
        subscription_tier = 'enterprise'
    WHERE id = new_user_id;

    result := jsonb_build_object(
        'user_id', new_user_id,
        'email', admin_email,
        'username', admin_username,
        'role', 'admin',
        'message', 'Admin user created successfully'
    );

    RETURN result;
EXCEPTION
    WHEN unique_violation THEN
        -- If user already exists, just update their role
        SELECT id INTO new_user_id FROM auth.users WHERE email = admin_email;
        
        UPDATE public.user_profiles 
        SET 
            role = 'admin',
            account_type = 'user',
            subscription_tier = 'enterprise'
        WHERE id = new_user_id;
        
        RETURN jsonb_build_object(
            'user_id', new_user_id,
            'email', admin_email,
            'message', 'Existing user upgraded to admin'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'message', 'Failed to create admin user'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create your admin account
SELECT create_admin_user(
    'jeremy@wavesite.com',  -- Change this to your email
    'AdminPass123!',        -- Change this to your secure password
    'jeremy_admin'          -- Change this to your username
);

-- Create activity log table for audit trail
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES public.user_profiles(id),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for activity log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs" ON public.user_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to log user activities
CREATE OR REPLACE FUNCTION log_user_activity(
    p_action TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_activity_log (
        user_id,
        action,
        target_user_id,
        details
    )
    VALUES (
        auth.uid(),
        p_action,
        p_target_user_id,
        p_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for user management
CREATE OR REPLACE VIEW public.user_management_view AS
SELECT 
    up.id,
    up.username,
    up.email,
    up.role,
    up.account_type,
    up.organization,
    up.is_active,
    up.created_at,
    up.last_login,
    up.subscription_tier,
    up.trends_spotted,
    up.accuracy_score,
    up.total_earnings,
    COUNT(DISTINCT ts.id) as total_submissions,
    COUNT(DISTINCT tv.id) as total_validations
FROM public.user_profiles up
LEFT JOIN public.trend_submissions ts ON up.id = ts.spotter_id
LEFT JOIN public.trend_validations tv ON up.id = tv.validator_id
GROUP BY up.id;

-- Grant permissions
GRANT SELECT ON public.user_management_view TO authenticated;
GRANT ALL ON public.user_activity_log TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.user_profiles IS 'Extended user profiles with role-based access control';
COMMENT ON COLUMN public.user_profiles.account_type IS 'Differentiates between regular users and client accounts';
COMMENT ON COLUMN public.user_profiles.role IS 'User role: participant, validator, manager, client, or admin';