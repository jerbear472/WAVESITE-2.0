-- WaveSight Reset and Seed Script
-- This script safely handles existing objects and populates with sample data

-- 1. First, let's check if trend_timeline table exists, if not create it
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_timeline_trend_id ON trend_timeline(trend_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON trend_timeline(timestamp);

-- Enable RLS if not already enabled
ALTER TABLE trend_timeline ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'trend_timeline' 
        AND policyname = 'Timeline data is viewable by everyone'
    ) THEN
        CREATE POLICY "Timeline data is viewable by everyone" ON trend_timeline
            FOR SELECT USING (true);
    END IF;
END $$;

-- 2. Clear existing data (optional - comment out if you want to keep existing data)
TRUNCATE trend_timeline CASCADE;
DELETE FROM trend_validations;
DELETE FROM trend_submissions;
DELETE FROM users WHERE email = 'demo@wavesight.com';

-- 3. Insert demo user
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

-- 4. Insert trend submissions
INSERT INTO trend_submissions (spotter_id, category, description, virality_prediction, quality_score, validation_count, status, bounty_amount, created_at, validated_at, mainstream_at, evidence, wave_score)
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
    '{"examples": ["@creator1", "@creator2", "@creator3"], "growth_rate": "300% in 7 days"}'::jsonb,
    75
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
    '{"examples": ["#SlowedRnB", "#90sRemix"], "growth_rate": "500% in 14 days"}'::jsonb,
    92
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
    '{"examples": ["Tutorial format spreading", "High engagement rates"], "growth_rate": "200% in 5 days"}'::jsonb,
    68
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
    '{"examples": ["Early adoption by comedy creators"], "growth_rate": "Just emerging"}'::jsonb,
    45
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
    '{"examples": ["Beauty influencers adopting", "Product selling out"], "growth_rate": "150% in 10 days"}'::jsonb,
    62
  );

-- 5. Generate timeline data for each trend
WITH trend_data AS (
  SELECT id, status, created_at, wave_score
  FROM trend_submissions
  WHERE spotter_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
),
timeline_generator AS (
  SELECT 
    t.id as trend_id,
    t.status,
    t.wave_score as final_score,
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
      LEAST(final_score, 10 + ((final_score - 10) * POWER(point_num::float / 19, 2))::int)
    WHEN status = 'approved' THEN 
      LEAST(final_score, 10 + ((final_score - 10) * point_num::float / 19)::int)
    ELSE 
      LEAST(final_score, 5 + ((final_score - 5) * point_num::float / 19 * 0.7)::int)
  END as wave_score,
  FLOOR((point_num::float / 19) * 20) as validation_count,
  0.1 + (RANDOM() * 0.3) as engagement_rate,
  10000 + FLOOR(RANDOM() * 990000)::int as platform_reach
FROM timeline_generator
ORDER BY trend_id, point_num;

-- 6. Add some trend validations
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
LIMIT 10
ON CONFLICT (trend_id, validator_id) DO NOTHING;

-- 7. Verify the data
SELECT 
  'Trends created:' as metric,
  COUNT(*) as count
FROM trend_submissions
WHERE spotter_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
UNION ALL
SELECT 
  'Timeline points created:',
  COUNT(*)
FROM trend_timeline
UNION ALL
SELECT 
  'Validations created:',
  COUNT(*)
FROM trend_validations;

-- 8. Show sample of the timeline data
SELECT 
  ts.description,
  ts.status,
  ts.wave_score as current_score,
  MIN(tl.wave_score) as starting_score,
  MAX(tl.wave_score) as peak_score,
  COUNT(tl.id) as data_points
FROM trend_submissions ts
JOIN trend_timeline tl ON ts.id = tl.trend_id
GROUP BY ts.id, ts.description, ts.status, ts.wave_score
ORDER BY ts.created_at DESC;