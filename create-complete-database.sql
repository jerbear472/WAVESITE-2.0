-- Complete Database Setup for Wave Site
-- Run this entire script in Supabase SQL Editor to set up all tables

-- First, create ENUMs if they don't exist
DO $$ BEGIN
    CREATE TYPE trend_category AS ENUM ('fashion', 'tech', 'food', 'travel', 'fitness', 'entertainment', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trend_status AS ENUM ('submitted', 'validating', 'validated', 'rejected', 'mainstream');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Create users table with ALL required columns
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    wave_points INTEGER DEFAULT 0,
    reputation_score DECIMAL(3,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "push": true,
        "trends": true,
        "earnings": true
    }'::jsonb,
    privacy_settings JSONB DEFAULT '{
        "profile_public": true,
        "show_earnings": false,
        "show_trends": true
    }'::jsonb,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en',
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create trend_submissions table with thumbnail columns
CREATE TABLE IF NOT EXISTS trend_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spotter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category trend_category NOT NULL,
    title TEXT,
    description TEXT NOT NULL,
    evidence JSONB,
    source_url TEXT,
    thumbnail_url TEXT,
    creator_handle TEXT,
    creator_name TEXT,
    post_caption TEXT,
    virality_prediction INTEGER CHECK (virality_prediction >= 1 AND virality_prediction <= 10),
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    wave_score INTEGER DEFAULT 50 CHECK (wave_score >= 0 AND wave_score <= 100),
    validation_count INTEGER DEFAULT 0,
    status trend_status DEFAULT 'submitted',
    bounty_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    mainstream_at TIMESTAMPTZ
);

-- 3. Create trend_validations table
CREATE TABLE IF NOT EXISTS trend_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    confirmed BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,2),
    notes TEXT,
    evidence_url TEXT,
    reward_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- 4. Create trend_timeline table
CREATE TABLE IF NOT EXISTS trend_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    wave_score INTEGER CHECK (wave_score >= 0 AND wave_score <= 100),
    validation_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(3,2),
    platform_reach INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create admin_users table (for admin permissions)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'moderator')),
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trends_spotter ON trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trends_status ON trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trends_category ON trend_submissions(category);
CREATE INDEX IF NOT EXISTS idx_trends_created ON trend_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_validations_trend ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_validations_validator ON trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_timeline_trend_id ON trend_timeline(trend_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON trend_timeline(timestamp);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public profiles are viewable" ON users;
CREATE POLICY "Public profiles are viewable"
ON users FOR SELECT
TO authenticated
USING (
    (privacy_settings->>'profile_public')::boolean = true
    OR auth.uid() = id
);

-- RLS Policies for trend_submissions
DROP POLICY IF EXISTS "Anyone can view trends" ON trend_submissions;
CREATE POLICY "Anyone can view trends"
ON trend_submissions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create trends" ON trend_submissions;
CREATE POLICY "Authenticated users can create trends"
ON trend_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = spotter_id);

DROP POLICY IF EXISTS "Users can update own trends" ON trend_submissions;
CREATE POLICY "Users can update own trends"
ON trend_submissions FOR UPDATE
TO authenticated
USING (auth.uid() = spotter_id)
WITH CHECK (auth.uid() = spotter_id);

-- RLS Policies for trend_validations
DROP POLICY IF EXISTS "Anyone can view validations" ON trend_validations;
CREATE POLICY "Anyone can view validations"
ON trend_validations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can validate" ON trend_validations;
CREATE POLICY "Authenticated users can validate"
ON trend_validations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = validator_id);

-- RLS Policies for trend_timeline
DROP POLICY IF EXISTS "Anyone can view timeline" ON trend_timeline;
CREATE POLICY "Anyone can view timeline"
ON trend_timeline FOR SELECT
USING (true);

-- RLS Policies for admin_users
DROP POLICY IF EXISTS "Admins can view admin table" ON admin_users;
CREATE POLICY "Admins can view admin table"
ON admin_users FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
));

-- Create a function to properly link auth users to the users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
SELECT 'Database setup complete! All tables and columns created successfully.' as message;