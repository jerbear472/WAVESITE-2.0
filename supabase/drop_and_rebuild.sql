-- WaveSight: Drop all tables and rebuild from scratch
-- WARNING: This will delete all existing data!

-- Drop all existing tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS trend_timeline CASCADE;
DROP TABLE IF EXISTS trend_validations CASCADE;
DROP TABLE IF EXISTS trend_submissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
DROP TABLE IF EXISTS ml_insights CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS trend_category CASCADE;
DROP TYPE IF EXISTS trend_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE trend_category AS ENUM (
    'visual_style', 
    'audio_music', 
    'creator_technique', 
    'meme_format', 
    'product_brand', 
    'behavior_pattern'
);

CREATE TYPE trend_status AS ENUM (
    'submitted', 
    'validating', 
    'approved', 
    'rejected', 
    'viral', 
    'mainstream'
);

-- 1. Create users table
CREATE TABLE users (
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

-- 2. Create trend_submissions table
CREATE TABLE trend_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spotter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category trend_category NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB,
    virality_prediction INTEGER CHECK (virality_prediction >= 1 AND virality_prediction <= 10),
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    validation_count INTEGER DEFAULT 0,
    status trend_status DEFAULT 'submitted',
    bounty_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    mainstream_at TIMESTAMPTZ
);

-- 3. Create trend_validations table
CREATE TABLE trend_validations (
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

-- 4. Create trend_timeline table (for tracking wave scores over time)
CREATE TABLE trend_timeline (
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
CREATE INDEX idx_trends_spotter ON trend_submissions(spotter_id);
CREATE INDEX idx_trends_status ON trend_submissions(status);
CREATE INDEX idx_trends_category ON trend_submissions(category);
CREATE INDEX idx_trends_created ON trend_submissions(created_at);
CREATE INDEX idx_validations_trend ON trend_validations(trend_id);
CREATE INDEX idx_validations_validator ON trend_validations(validator_id);
CREATE INDEX idx_timeline_trend_id ON trend_timeline(trend_id);
CREATE INDEX idx_timeline_timestamp ON trend_timeline(timestamp);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_timeline ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

CREATE POLICY "Trend submissions are viewable by everyone" ON trend_submissions
    FOR SELECT USING (true);

CREATE POLICY "Trend validations are viewable by everyone" ON trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Timeline data is viewable by everyone" ON trend_timeline
    FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON users TO anon;
GRANT SELECT ON trend_submissions TO anon;
GRANT SELECT ON trend_validations TO anon;
GRANT SELECT ON trend_timeline TO anon;

GRANT ALL ON users TO authenticated;
GRANT ALL ON trend_submissions TO authenticated;
GRANT ALL ON trend_validations TO authenticated;
GRANT ALL ON trend_timeline TO authenticated;

-- Insert demo data
-- 5. Create demo user
INSERT INTO users (id, email, username, display_name, bio, wave_points, reputation_score)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo@wavesight.com',
    'demo_user',
    'Demo User',
    'Testing WaveSight platform',
    100,
    0.85
);

-- 6. Insert trend submissions
INSERT INTO trend_submissions (
    spotter_id, category, description, virality_prediction, 
    quality_score, validation_count, status, bounty_amount, 
    created_at, validated_at, mainstream_at, evidence
)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'visual_style',
    'Neon gradient overlays on portrait videos - seeing 300% increase across TikTok beauty creators',
    8,
    0.85,
    15,
    'approved',
    250,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '4 days',
    NULL,
    '{"examples": ["@creator1", "@creator2", "@creator3"], "growth_rate": "300% in 7 days"}'::jsonb
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'audio_music',
    'Slowed + reverb versions of 90s R&B hits mixed with trap beats',
    9,
    0.92,
    23,
    'viral',
    500,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '9 days',
    NOW() - INTERVAL '3 days',
    '{"examples": ["#SlowedRnB", "#90sRemix"], "growth_rate": "500% in 14 days"}'::jsonb
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'creator_technique',
    'Split-screen tutorials where creator shows "expectation vs reality" simultaneously',
    7,
    0.78,
    12,
    'approved',
    175,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    NULL,
    '{"examples": ["Tutorial format spreading", "High engagement rates"], "growth_rate": "200% in 5 days"}'::jsonb
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'meme_format',
    'POV: You''re the main character but everyone else has the script',
    9,
    0.88,
    8,
    'validating',
    0,
    NOW() - INTERVAL '18 hours',
    NULL,
    NULL,
    '{"examples": ["Early adoption by comedy creators"], "growth_rate": "Just emerging"}'::jsonb
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'product_brand',
    'Rhode lip tint being used as blush - beauty hack going viral',
    6,
    0.72,
    19,
    'approved',
    125,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '6 days',
    NULL,
    '{"examples": ["Beauty influencers adopting", "Product selling out"], "growth_rate": "150% in 10 days"}'::jsonb
  );

-- 7. Generate timeline data with wave scores
WITH trend_data AS (
  SELECT id, status, created_at
  FROM trend_submissions
  WHERE spotter_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
),
timeline_generator AS (
  SELECT 
    t.id as trend_id,
    t.status,
    generate_series(0, 19) as point_num,
    t.created_at
  FROM trend_data t
)
INSERT INTO trend_timeline (trend_id, timestamp, wave_score, validation_count, engagement_rate, platform_reach)
SELECT 
  trend_id,
  created_at - INTERVAL '10 days' + (point_num * INTERVAL '12 hours'),
  CASE 
    WHEN status = 'viral' THEN 
      LEAST(100, 10 + (90 * POWER(point_num::float / 19, 2))::int)
    WHEN status = 'approved' THEN 
      LEAST(80, 10 + (70 * point_num::float / 19)::int)
    ELSE 
      LEAST(50, 5 + (45 * point_num::float / 19 * 0.7)::int)
  END as wave_score,
  FLOOR((point_num::float / 19) * 20) as validation_count,
  0.1 + (RANDOM() * 0.3) as engagement_rate,
  10000 + FLOOR(RANDOM() * 990000)::int as platform_reach
FROM timeline_generator
ORDER BY trend_id, point_num;

-- 8. Add the current wave score to trend_submissions
UPDATE trend_submissions ts
SET validation_count = COALESCE(
  (SELECT MAX(validation_count) FROM trend_timeline tl WHERE tl.trend_id = ts.id),
  validation_count
);

-- 9. Verify setup
SELECT 
  'Database rebuilt successfully!' as status,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM trend_submissions) as trends_count,
  (SELECT COUNT(*) FROM trend_timeline) as timeline_points_count;

-- 10. Show sample data
SELECT 
  ts.description,
  ts.category,
  ts.status,
  COUNT(tl.id) as timeline_points,
  MIN(tl.wave_score) as min_score,
  MAX(tl.wave_score) as max_score
FROM trend_submissions ts
LEFT JOIN trend_timeline tl ON ts.id = tl.trend_id
GROUP BY ts.id, ts.description, ts.category, ts.status
ORDER BY ts.created_at DESC;