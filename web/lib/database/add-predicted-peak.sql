-- Add predicted_peak and actual_peak fields to trend_submissions table
-- These fields track when a trend is expected to peak and when it actually peaked

-- Add predicted_peak column
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS predicted_peak TIMESTAMP WITH TIME ZONE;

-- Add actual_peak column (set when trend is validated as peaked)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS actual_peak TIMESTAMP WITH TIME ZONE;

-- Add peak_confidence score (0-100)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS peak_confidence INTEGER DEFAULT 50 
  CHECK (peak_confidence >= 0 AND peak_confidence <= 100);

-- Add trend_phase to track where the trend is in its lifecycle
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_phase TEXT DEFAULT 'emerging'
  CHECK (trend_phase IN ('emerging', 'rising', 'peaking', 'peaked', 'declining', 'dead'));

-- Create index for faster queries on past trends
CREATE INDEX IF NOT EXISTS idx_trend_submissions_predicted_peak 
ON trend_submissions(predicted_peak) 
WHERE predicted_peak IS NOT NULL;

-- Create index for trend phase queries
CREATE INDEX IF NOT EXISTS idx_trend_submissions_trend_phase 
ON trend_submissions(trend_phase);

-- Update existing records with estimated predicted_peak
-- Set predicted peak to 7-30 days from submission for existing validated trends
UPDATE trend_submissions 
SET predicted_peak = created_at + INTERVAL '14 days',
    trend_phase = CASE 
        WHEN status IN ('validated', 'quality_approved') THEN 'rising'
        WHEN status = 'trending' THEN 'peaking'
        ELSE 'emerging'
    END
WHERE predicted_peak IS NULL;

-- Create a function to auto-update trend phases based on time
CREATE OR REPLACE FUNCTION update_trend_phase()
RETURNS void AS $$
BEGIN
  -- Mark trends as peaked if predicted_peak has passed
  UPDATE trend_submissions
  SET trend_phase = 'peaked'
  WHERE predicted_peak < NOW() 
    AND trend_phase IN ('emerging', 'rising', 'peaking')
    AND predicted_peak IS NOT NULL;
  
  -- Mark old trends as declining (peaked over 7 days ago)
  UPDATE trend_submissions
  SET trend_phase = 'declining'
  WHERE predicted_peak < NOW() - INTERVAL '7 days'
    AND trend_phase = 'peaked'
    AND predicted_peak IS NOT NULL;
  
  -- Mark very old trends as dead (peaked over 30 days ago)
  UPDATE trend_submissions
  SET trend_phase = 'dead'
  WHERE predicted_peak < NOW() - INTERVAL '30 days'
    AND trend_phase IN ('declining', 'peaked')
    AND predicted_peak IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a view for past trends (trends that have peaked)
CREATE OR REPLACE VIEW past_trends AS
SELECT 
  ts.*,
  EXTRACT(DAY FROM (NOW() - predicted_peak)) as days_since_peak,
  up.username as spotter_username,
  up.avatar_url as spotter_avatar
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id
WHERE ts.predicted_peak < NOW()
  AND ts.status IN ('validated', 'quality_approved', 'trending')
  AND ts.predicted_peak IS NOT NULL
ORDER BY ts.predicted_peak DESC;

-- Create a view for upcoming trends (trends expected to peak soon)
CREATE OR REPLACE VIEW upcoming_trends AS
SELECT 
  ts.*,
  EXTRACT(DAY FROM (predicted_peak - NOW())) as days_until_peak,
  up.username as spotter_username,
  up.avatar_url as spotter_avatar
FROM trend_submissions ts
LEFT JOIN user_profiles up ON ts.spotter_id = up.id
WHERE ts.predicted_peak > NOW()
  AND ts.status IN ('validated', 'quality_approved', 'trending')
  AND ts.predicted_peak IS NOT NULL
ORDER BY ts.predicted_peak ASC;

-- Grant permissions
GRANT SELECT ON past_trends TO authenticated;
GRANT SELECT ON upcoming_trends TO authenticated;