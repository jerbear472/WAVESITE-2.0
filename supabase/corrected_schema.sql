-- WaveSight Database Schema
-- Run this FIRST in Supabase SQL Editor before running the seed data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE trend_category AS ENUM ('visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trend_status AS ENUM ('submitted', 'validating', 'approved', 'rejected', 'viral', 'mainstream');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (simplified version)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    wave_points INTEGER DEFAULT 0,
    reputation_score DECIMAL(3,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Trend submissions table
CREATE TABLE IF NOT EXISTS trend_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spotter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category trend_category NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB,
    virality_prediction INTEGER CHECK (virality_prediction >= 1 AND virality_prediction <= 10),
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    wave_score INTEGER DEFAULT 0 CHECK (wave_score >= 0 AND wave_score <= 100),
    validation_count INTEGER DEFAULT 0,
    status trend_status DEFAULT 'submitted',
    bounty_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    mainstream_at TIMESTAMPTZ
);

-- Trend validations table
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

-- Trend timeline table (for tracking wave scores over time)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trends_spotter ON trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trends_status ON trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trends_category ON trend_submissions(category);
CREATE INDEX IF NOT EXISTS idx_trends_created ON trend_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_validations_trend ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_validations_validator ON trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_timeline_trend_id ON trend_timeline(trend_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON trend_timeline(timestamp);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Anyone can read, only self can update
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Trend submissions: Anyone can read, authenticated can insert
CREATE POLICY "Trend submissions are viewable by everyone" ON trend_submissions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can submit trends" ON trend_submissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own trends" ON trend_submissions
    FOR UPDATE USING (auth.uid()::text = spotter_id::text);

-- Trend validations: Anyone can read, authenticated can insert
CREATE POLICY "Trend validations are viewable by everyone" ON trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can validate trends" ON trend_validations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Timeline: Anyone can read
CREATE POLICY "Timeline data is viewable by everyone" ON trend_timeline
    FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- For anonymous access (read-only)
GRANT SELECT ON users TO anon;
GRANT SELECT ON trend_submissions TO anon;
GRANT SELECT ON trend_validations TO anon;
GRANT SELECT ON trend_timeline TO anon;

-- For authenticated users
GRANT ALL ON users TO authenticated;
GRANT ALL ON trend_submissions TO authenticated;
GRANT ALL ON trend_validations TO authenticated;
GRANT ALL ON trend_timeline TO authenticated;