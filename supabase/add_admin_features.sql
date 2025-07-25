-- Add view_mode to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'user' CHECK (view_mode IN ('user', 'professional'));

-- Add permissions JSON column for granular access control
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Update jeremyuys to be an admin
UPDATE public.user_profiles 
SET role = 'admin',
    permissions = jsonb_build_object(
        'can_manage_users', true,
        'can_switch_views', true,
        'can_access_all_data', true,
        'can_manage_permissions', true
    )
WHERE username = 'jeremyuys' OR email = 'jeremyuys@gmail.com';

-- Create a table for managing user access levels
CREATE TABLE IF NOT EXISTS public.access_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('viewer', 'analyst', 'manager', 'admin')),
    permissions JSONB DEFAULT '{}',
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, admin_id)
);

-- Enable RLS on access_controls
ALTER TABLE public.access_controls ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage access controls
CREATE POLICY "Admins can manage access controls" ON public.access_controls
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy: Users can view their own access controls
CREATE POLICY "Users can view their own access" ON public.access_controls
    FOR SELECT USING (auth.uid() = user_id);

-- Update RLS policies for admin access
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create a function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id
        AND (
            role = 'admin' OR
            (permissions->permission)::boolean = true
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_view_mode ON public.user_profiles(view_mode);
CREATE INDEX IF NOT EXISTS idx_access_controls_user_id ON public.access_controls(user_id);
CREATE INDEX IF NOT EXISTS idx_access_controls_admin_id ON public.access_controls(admin_id);