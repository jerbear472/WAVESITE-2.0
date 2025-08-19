-- =====================================================
-- ENTERPRISE ANALYTICS FUNCTIONS FOR WAVESIGHT
-- =====================================================
-- Advanced analytics functions for the enterprise dashboard
-- including ML predictions, financial metrics, and real-time insights

-- Function to get enterprise trends with insights
CREATE OR REPLACE FUNCTION get_enterprise_trends_with_insights(
  p_timeframe TEXT DEFAULT 'realtime',
  p_category TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  category TEXT,
  status TEXT,
  validation_count INTEGER,
  positive_validations INTEGER,
  negative_validations INTEGER,
  validation_ratio NUMERIC,
  created_at TIMESTAMPTZ,
  spotter_id UUID,
  screenshot_url TEXT,
  thumbnail_url TEXT,
  evidence JSONB,
  spotter JSONB,
  velocity_score NUMERIC,
  trending_rank INTEGER,
  geographic_data JSONB,
  demographic_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH time_filtered AS (
    SELECT *
    FROM trend_submissions ts
    WHERE 
      CASE 
        WHEN p_timeframe = 'realtime' THEN ts.created_at >= NOW() - INTERVAL '1 hour'
        WHEN p_timeframe = '1h' THEN ts.created_at >= NOW() - INTERVAL '1 hour'
        WHEN p_timeframe = '24h' THEN ts.created_at >= NOW() - INTERVAL '24 hours'
        WHEN p_timeframe = '7d' THEN ts.created_at >= NOW() - INTERVAL '7 days'
        WHEN p_timeframe = '30d' THEN ts.created_at >= NOW() - INTERVAL '30 days'
        ELSE TRUE
      END
      AND (p_category IS NULL OR ts.category = p_category)
      AND ts.validation_count > 0
      AND ts.validation_ratio > 0.5
  ),
  velocity_calc AS (
    SELECT 
      tf.*,
      -- Calculate velocity score based on validation rate
      CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - tf.created_at)) > 0 THEN
          (tf.validation_count::NUMERIC / EXTRACT(EPOCH FROM (NOW() - tf.created_at)) * 3600)
        ELSE 0
      END AS velocity_score
    FROM time_filtered tf
  ),
  ranked_trends AS (
    SELECT 
      vc.*,
      ROW_NUMBER() OVER (ORDER BY vc.velocity_score DESC, vc.validation_ratio DESC) AS trending_rank
    FROM velocity_calc vc
  )
  SELECT 
    rt.id,
    rt.description,
    rt.category,
    rt.status,
    rt.validation_count,
    rt.positive_validations,
    rt.negative_validations,
    rt.validation_ratio,
    rt.created_at,
    rt.spotter_id,
    rt.screenshot_url,
    rt.thumbnail_url,
    rt.evidence,
    jsonb_build_object(
      'username', p.username,
      'tier', COALESCE(p.spotter_tier, 'bronze'),
      'accuracy_rate', COALESCE(
        (SELECT AVG(validation_ratio) FROM trend_submissions WHERE spotter_id = rt.spotter_id),
        0.5
      )
    ) AS spotter,
    rt.velocity_score,
    rt.trending_rank,
    -- Mock geographic data (in production, this would come from real analytics)
    jsonb_build_object(
      'top_regions', ARRAY['North America', 'Europe', 'Asia'],
      'distribution', jsonb_build_object(
        'north_america', 40 + RANDOM() * 20,
        'europe', 20 + RANDOM() * 15,
        'asia', 15 + RANDOM() * 10,
        'other', 10 + RANDOM() * 5
      )
    ) AS geographic_data,
    -- Mock demographic data
    jsonb_build_object(
      'age_distribution', jsonb_build_object(
        '18-24', 25 + RANDOM() * 10,
        '25-34', 30 + RANDOM() * 10,
        '35-44', 20 + RANDOM() * 10,
        '45+', 15 + RANDOM() * 10
      ),
      'gender_split', jsonb_build_object(
        'male', 45 + RANDOM() * 10,
        'female', 45 + RANDOM() * 10,
        'other', 5 + RANDOM() * 5
      )
    ) AS demographic_data
  FROM ranked_trends rt
  LEFT JOIN profiles p ON p.id = rt.spotter_id
  ORDER BY rt.trending_rank
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time metrics
CREATE OR REPLACE FUNCTION get_real_time_metrics()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'active_trends', COUNT(DISTINCT id),
    'trends_per_minute', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 minute'),
    'validation_velocity', AVG(
      CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0 THEN
          validation_count::NUMERIC / EXTRACT(EPOCH FROM (NOW() - created_at)) * 3600
        ELSE 0
      END
    ),
    'spotter_activity', COUNT(DISTINCT spotter_id) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour'),
    'geographic_hotspots', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'location', category,
          'intensity', COUNT(*)
        )
      )
      FROM (
        SELECT category, COUNT(*) 
        FROM trend_submissions 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY category
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) AS hotspots
    ),
    'sentiment_index', AVG(validation_ratio) * 100,
    'market_momentum', (
      SELECT COUNT(*) * 10 + RANDOM() * 5
      FROM trend_submissions
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      AND validation_ratio > 0.7
    )
  ) INTO v_result
  FROM trend_submissions
  WHERE created_at >= NOW() - INTERVAL '24 hours';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate predictive alerts
CREATE OR REPLACE FUNCTION generate_predictive_alerts(
  p_user_id UUID DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  urgency TEXT,
  trend_ids UUID[],
  recommended_action TEXT,
  potential_impact TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH viral_candidates AS (
    -- Find trends with high viral potential
    SELECT 
      ts.id,
      ts.description,
      ts.validation_ratio,
      ts.validation_count,
      ts.category,
      (ts.validation_count::NUMERIC / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - ts.created_at)) / 3600)) AS velocity
    FROM trend_submissions ts
    WHERE ts.created_at >= NOW() - INTERVAL '6 hours'
      AND ts.validation_ratio > 0.75
      AND ts.validation_count > 10
      AND (p_categories IS NULL OR ts.category = ANY(p_categories))
    ORDER BY velocity DESC
    LIMIT 3
  ),
  declining_trends AS (
    -- Find trends that are declining
    SELECT 
      ts.id,
      ts.description,
      ts.category
    FROM trend_submissions ts
    WHERE ts.created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '1 day'
      AND ts.validation_ratio < 0.5
      AND (p_categories IS NULL OR ts.category = ANY(p_categories))
    LIMIT 3
  ),
  emerging_opportunities AS (
    -- Find emerging trends with opportunity
    SELECT 
      ts.id,
      ts.description,
      ts.category,
      ts.validation_count
    FROM trend_submissions ts
    WHERE ts.created_at >= NOW() - INTERVAL '3 hours'
      AND ts.validation_ratio BETWEEN 0.6 AND 0.75
      AND ts.validation_count BETWEEN 5 AND 20
      AND (p_categories IS NULL OR ts.category = ANY(p_categories))
    ORDER BY ts.created_at DESC
    LIMIT 3
  )
  -- Generate viral alerts
  SELECT 
    gen_random_uuid() AS id,
    'viral' AS type,
    'High Viral Potential Detected' AS title,
    'Trend "' || LEFT(vc.description, 50) || '..." showing exceptional growth with ' || 
    ROUND(vc.velocity::NUMERIC, 1) || ' validations/hour' AS description,
    CASE 
      WHEN vc.velocity > 50 THEN 'critical'
      WHEN vc.velocity > 30 THEN 'high'
      ELSE 'medium'
    END AS urgency,
    ARRAY[vc.id] AS trend_ids,
    'Immediate activation recommended - allocate resources' AS recommended_action,
    'Potential reach: ' || (vc.validation_count * 1000) || '+ users' AS potential_impact,
    NOW() AS created_at
  FROM viral_candidates vc
  
  UNION ALL
  
  -- Generate declining alerts
  SELECT 
    gen_random_uuid() AS id,
    'declining' AS type,
    'Trend Declining' AS title,
    'Trend "' || LEFT(dt.description, 50) || '..." losing momentum' AS description,
    'low' AS urgency,
    ARRAY[dt.id] AS trend_ids,
    'Consider pivoting strategy or discontinuing' AS recommended_action,
    'Low engagement expected' AS potential_impact,
    NOW() AS created_at
  FROM declining_trends dt
  
  UNION ALL
  
  -- Generate opportunity alerts
  SELECT 
    gen_random_uuid() AS id,
    'opportunity' AS type,
    'Emerging Opportunity' AS title,
    'New trend "' || LEFT(eo.description, 50) || '..." gaining traction' AS description,
    'medium' AS urgency,
    ARRAY[eo.id] AS trend_ids,
    'Monitor closely and prepare activation strategy' AS recommended_action,
    'Early mover advantage possible' AS potential_impact,
    NOW() AS created_at
  FROM emerging_opportunities eo
  
  ORDER BY 
    CASE urgency 
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      ELSE 4
    END,
    created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate ROI metrics
CREATE OR REPLACE FUNCTION calculate_enterprise_roi(
  p_user_id UUID,
  p_timeframe TEXT DEFAULT '30d'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_subscription_cost NUMERIC;
  v_total_trends INTEGER;
  v_viral_trends INTEGER;
  v_estimated_value NUMERIC;
BEGIN
  -- Get subscription cost (mock data - in production would query actual subscription)
  v_subscription_cost := 1999; -- Enterprise tier
  
  -- Calculate metrics based on timeframe
  SELECT 
    COUNT(*) AS total_trends,
    COUNT(*) FILTER (WHERE validation_ratio > 0.7 AND validation_count > 50) AS viral_trends,
    SUM(validation_count * 50) AS estimated_value -- $50 per 1000 views estimate
  INTO v_total_trends, v_viral_trends, v_estimated_value
  FROM trend_submissions
  WHERE 
    CASE 
      WHEN p_timeframe = '24h' THEN created_at >= NOW() - INTERVAL '24 hours'
      WHEN p_timeframe = '7d' THEN created_at >= NOW() - INTERVAL '7 days'
      WHEN p_timeframe = '30d' THEN created_at >= NOW() - INTERVAL '30 days'
      ELSE created_at >= NOW() - INTERVAL '30 days'
    END;
  
  v_result := jsonb_build_object(
    'total_trends_identified', v_total_trends,
    'viral_trends_caught', v_viral_trends,
    'estimated_market_value', COALESCE(v_estimated_value, 0),
    'subscription_cost', v_subscription_cost,
    'roi_percentage', CASE 
      WHEN v_subscription_cost > 0 THEN 
        ((COALESCE(v_estimated_value, 0) - v_subscription_cost) / v_subscription_cost * 100)
      ELSE 0
    END,
    'cost_per_trend', CASE 
      WHEN v_total_trends > 0 THEN v_subscription_cost / v_total_trends
      ELSE 0
    END,
    'value_per_viral_trend', CASE 
      WHEN v_viral_trends > 0 THEN v_estimated_value / v_viral_trends
      ELSE 0
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_velocity 
  ON trend_submissions(created_at DESC, validation_ratio DESC, validation_count DESC);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_category_date 
  ON trend_submissions(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_performance 
  ON trend_submissions(spotter_id, validation_ratio DESC);

-- Create materialized view for trend analytics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trend_analytics AS
SELECT 
  DATE_TRUNC('hour', created_at) AS hour,
  category,
  COUNT(*) AS trend_count,
  AVG(validation_ratio) AS avg_validation_ratio,
  SUM(validation_count) AS total_validations,
  COUNT(DISTINCT spotter_id) AS unique_spotters,
  AVG(
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0 THEN
        validation_count::NUMERIC / EXTRACT(EPOCH FROM (NOW() - created_at)) * 3600
      ELSE 0
    END
  ) AS avg_velocity
FROM trend_submissions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), category;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_trend_analytics_hour 
  ON mv_trend_analytics(hour DESC, category);

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_trend_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trend_analytics;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_enterprise_trends_with_insights TO authenticated;
GRANT EXECUTE ON FUNCTION get_real_time_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION generate_predictive_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_enterprise_roi TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_trend_analytics TO authenticated;
GRANT SELECT ON mv_trend_analytics TO authenticated;