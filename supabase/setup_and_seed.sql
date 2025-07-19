-- WaveSight Database Setup and Seed Data
-- Run this in Supabase SQL Editor

-- 1. Create trend_timeline table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_timeline_trend_id ON trend_timeline(trend_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON trend_timeline(timestamp);

-- 2. Insert demo user
INSERT INTO users (id, email, username, display_name, bio, wave_points, reputation_score)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'demo@wavesight.com',
  'demo_user',
  'Demo User',
  'Testing WaveSight platform',
  100,
  0.85
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert trend submissions
INSERT INTO trend_submissions (spotter_id, category, description, virality_prediction, quality_score, validation_count, status, bounty_amount, created_at, validated_at, mainstream_at, evidence)
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

-- 4. Generate timeline data for each trend
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
  created_at + (point_num * INTERVAL '12 hours'),
  CASE 
    WHEN status = 'viral' THEN LEAST(100, 10 + (90 * POWER(point_num::float / 20, 2))::int)
    WHEN status = 'approved' THEN LEAST(80, 10 + (70 * point_num::float / 20)::int)
    ELSE LEAST(50, 5 + (45 * point_num::float / 20 * 0.5)::int)
  END as wave_score,
  (point_num * 2) as validation_count,
  0.1 + (RANDOM() * 0.3) as engagement_rate,
  10000 + FLOOR(RANDOM() * 990000)::int as platform_reach
FROM timeline_generator;

-- 5. Add some trend validations
INSERT INTO trend_validations (trend_id, validator_id, confirmed, notes, reward_amount, created_at)
SELECT 
  t.id,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  CASE WHEN RANDOM() > 0.2 THEN true ELSE false END,
  'Confirmed seeing this trend spreading rapidly',
  2.0,
  t.created_at + INTERVAL '1 day'
FROM trend_submissions t
WHERE t.validation_count > 0
  AND t.spotter_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
LIMIT 10;

-- 6. Enable RLS on timeline table
ALTER TABLE trend_timeline ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read timeline data
CREATE POLICY "Timeline data is viewable by everyone" ON trend_timeline
  FOR SELECT USING (true);

-- 7. Grant permissions
GRANT SELECT ON trend_timeline TO anon, authenticated;
GRANT INSERT, UPDATE ON trend_timeline TO authenticated;

-- View the results
SELECT 
  t.description,
  t.status,
  t.wave_score as latest_score,
  COUNT(tl.id) as timeline_points
FROM trend_submissions t
LEFT JOIN trend_timeline tl ON t.id = tl.trend_id
WHERE t.spotter_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
GROUP BY t.id, t.description, t.status, t.wave_score
ORDER BY t.created_at DESC;