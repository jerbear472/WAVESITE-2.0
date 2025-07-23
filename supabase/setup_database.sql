-- Complete database setup for WAVESITE 2.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing types if they exist (to avoid conflicts)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS trend_category CASCADE;
DROP TYPE IF EXISTS trend_status CASCADE;

-- Create custom types
CREATE TYPE user_role AS ENUM ('participant', 'validator', 'manager', 'admin');
CREATE TYPE trend_category AS ENUM ('visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern');
CREATE TYPE trend_status AS ENUM ('submitted', 'validating', 'approved', 'rejected', 'viral');

-- Drop tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.trend_validations CASCADE;
DROP TABLE IF EXISTS public.trend_submissions CASCADE;
DROP TABLE IF EXISTS public.recordings CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'participant',
    demographics JSONB,
    interests JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    pending_earnings DECIMAL(10,2) DEFAULT 0.00,
    trends_spotted INTEGER DEFAULT 0,
    accuracy_score DECIMAL(3,2) DEFAULT 0.00,
    validation_score DECIMAL(3,2) DEFAULT 0.00
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Recordings table
CREATE TABLE public.recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    duration INTEGER,
    platform TEXT,
    processed BOOLEAN DEFAULT FALSE,
    privacy_filtered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_metadata JSONB
);

-- Enable RLS for recordings
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recordings" ON public.recordings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings" ON public.recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trend submissions table
CREATE TABLE public.trend_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spotter_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    category trend_category NOT NULL,
    description TEXT NOT NULL,
    screenshot_url TEXT,
    evidence JSONB,
    virality_prediction INTEGER CHECK (virality_prediction >= 1 AND virality_prediction <= 10),
    predicted_peak_date TIMESTAMPTZ,
    status trend_status DEFAULT 'submitted',
    approved_by_id UUID REFERENCES public.user_profiles(id),
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    validation_count INTEGER DEFAULT 0,
    bounty_amount DECIMAL(10,2) DEFAULT 0.00,
    bounty_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    mainstream_at TIMESTAMPTZ
);

-- Enable RLS for trend_submissions
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved trends" ON public.trend_submissions
    FOR SELECT USING (status = 'approved' OR status = 'viral');

CREATE POLICY "Users can view their own submissions" ON public.trend_submissions
    FOR SELECT USING (auth.uid() = spotter_id);

CREATE POLICY "Authenticated users can submit trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id);

-- Trend validations table
CREATE TABLE public.trend_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    confirmed BOOLEAN NOT NULL,
    evidence_url TEXT,
    notes TEXT,
    reward_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- Enable RLS for trend_validations
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validations" ON public.trend_validations
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can validate trends" ON public.trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_type TEXT,
    status TEXT,
    stripe_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_trend_submissions_category ON public.trend_submissions(category);
CREATE INDEX idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX idx_trend_submissions_created_at ON public.trend_submissions(created_at);
CREATE INDEX idx_trend_validations_trend_id ON public.trend_validations(trend_id);
CREATE INDEX idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, username, role)
    VALUES (
        new.id, 
        new.email,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        'participant'
    );
    RETURN new;
EXCEPTION 
    WHEN unique_violation THEN
        -- Profile already exists, ignore
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create view for trend insights
CREATE OR REPLACE VIEW public.trend_insights AS
SELECT 
    ts.id,
    ts.category,
    ts.description,
    ts.virality_prediction,
    ts.status,
    ts.created_at,
    ts.quality_score,
    ts.validation_count,
    ts.bounty_amount,
    up.username as spotter_username,
    COUNT(tv.id) as total_validations,
    COUNT(CASE WHEN tv.confirmed THEN 1 END) as positive_validations
FROM public.trend_submissions ts
LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id
LEFT JOIN public.trend_validations tv ON ts.id = tv.trend_id
GROUP BY ts.id, up.username;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.recordings TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.trend_validations TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT SELECT ON public.trend_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Create storage buckets (run these in Supabase Dashboard under Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);

-- Storage policies would be added via Supabase Dashboard

-- Confirm setup
SELECT 'Database setup complete!' as message;