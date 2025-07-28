-- Update the signup trigger to handle all tables properly
-- This ensures user_settings and user_account_settings are created automatically

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (
        id, 
        email, 
        username,
        birthday,
        age_verified,
        subscription_tier,
        created_at
    )
    VALUES (
        new.id, 
        new.email,
        COALESCE(
            new.raw_user_meta_data->>'username', 
            split_part(new.email, '@', 1)
        ),
        (new.raw_user_meta_data->>'birthday')::DATE,
        CASE 
            WHEN new.raw_user_meta_data->>'birthday' IS NOT NULL THEN TRUE 
            ELSE FALSE 
        END,
        'starter',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = CASE 
            WHEN profiles.username IS NULL THEN EXCLUDED.username 
            ELSE profiles.username 
        END,
        birthday = CASE
            WHEN profiles.birthday IS NULL THEN EXCLUDED.birthday
            ELSE profiles.birthday
        END;

    -- Create user_settings
    INSERT INTO public.user_settings (
        user_id,
        notification_preferences,
        privacy_settings,
        created_at
    )
    VALUES (
        new.id,
        '{"email": true, "push": true, "trends": true}'::jsonb,
        '{"profile_visibility": "public", "show_earnings": false}'::jsonb,
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create user_account_settings
    INSERT INTO public.user_account_settings (
        user_id,
        account_type,
        created_at
    )
    VALUES (
        new.id,
        'user',
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN new;
EXCEPTION WHEN others THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test that it's working by checking recent users
SELECT 
    au.id,
    au.email,
    p.username,
    us.user_id as has_settings,
    uas.user_id as has_account_settings
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.user_settings us ON au.id = us.user_id
LEFT JOIN public.user_account_settings uas ON au.id = uas.user_id
ORDER BY au.created_at DESC
LIMIT 5;