-- Check if data was created successfully
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Trends:', COUNT(*) FROM trend_submissions
UNION ALL
SELECT 'Timeline points:', COUNT(*) FROM trend_timeline
UNION ALL
SELECT 'Validations:', COUNT(*) FROM trend_validations;

-- Check sample trends
SELECT 
  id,
  category,
  status,
  description,
  created_at
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Check timeline data
SELECT 
  ts.description,
  COUNT(tl.id) as timeline_points,
  MIN(tl.wave_score) as min_score,
  MAX(tl.wave_score) as max_score
FROM trend_submissions ts
LEFT JOIN trend_timeline tl ON ts.id = tl.trend_id
GROUP BY ts.id, ts.description
LIMIT 5;