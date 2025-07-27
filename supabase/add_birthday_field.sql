-- Add birthday field to profiles table for age verification

-- Add birthday column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add age verification flag
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;

-- Create function to check if user is 18+
CREATE OR REPLACE FUNCTION check_user_age(birthday_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is at least 18 years old
    RETURN birthday_date <= CURRENT_DATE - INTERVAL '18 years';
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate user age
CREATE OR REPLACE FUNCTION calculate_age(birthday_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birthday_date));
END;
$$ LANGUAGE plpgsql;

-- Update the handle_new_user function to include birthday
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, birthday, age_verified)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'username',
        (new.raw_user_meta_data->>'birthday')::DATE,
        CASE 
            WHEN (new.raw_user_meta_data->>'birthday')::DATE IS NOT NULL 
            THEN check_user_age((new.raw_user_meta_data->>'birthday')::DATE)
            ELSE false
        END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy to ensure only 18+ users can access certain features
CREATE POLICY "Only verified 18+ users can create trends" ON trend_submissions
    FOR INSERT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.age_verified = true
        )
    );

-- Add constraint to ensure birthday is not in the future
ALTER TABLE profiles
ADD CONSTRAINT birthday_not_future CHECK (birthday <= CURRENT_DATE);

-- Add constraint to ensure birthday is reasonable (not more than 120 years ago)
ALTER TABLE profiles
ADD CONSTRAINT birthday_reasonable CHECK (birthday >= CURRENT_DATE - INTERVAL '120 years');