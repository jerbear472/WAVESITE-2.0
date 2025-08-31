-- Single transaction function for trend submission
-- Handles everything in one atomic operation

CREATE OR REPLACE FUNCTION submit_trend_atomic(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_category trend_category,
  p_platform TEXT DEFAULT 'unknown',
  p_post_url TEXT DEFAULT NULL,
  p_screenshot_url TEXT DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_creator_handle TEXT DEFAULT NULL,
  p_views_count INTEGER DEFAULT 0,
  p_likes_count INTEGER DEFAULT 0,
  p_comments_count INTEGER DEFAULT 0,
  p_wave_score INTEGER DEFAULT 50,
  p_hashtags TEXT[] DEFAULT '{}',
  p_trend_velocity TEXT DEFAULT NULL,
  p_trend_size TEXT DEFAULT NULL,
  p_ai_angle TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trend_id UUID;
  v_base_xp INTEGER := 10;
  v_total_xp INTEGER;
  v_level INTEGER;
  v_daily_streak INTEGER;
  v_final_xp INTEGER;
  v_result JSON;
BEGIN
  -- Start transaction
  BEGIN
    -- 1. Insert trend submission
    INSERT INTO trend_submissions (
      spotter_id,
      title,
      description,
      category,
      platform,
      post_url,
      screenshot_url,
      thumbnail_url,
      creator_handle,
      views_count,
      likes_count,
      comments_count,
      wave_score,
      quality_score,
      hashtags,
      trend_velocity,
      trend_size,
      ai_angle,
      status,
      payment_amount
    ) VALUES (
      p_user_id,
      p_title,
      p_description,
      p_category,
      p_platform,
      p_post_url,
      p_screenshot_url,
      p_thumbnail_url,
      p_creator_handle,
      p_views_count,
      p_likes_count,
      p_comments_count,
      p_wave_score,
      75, -- default quality score
      p_hashtags,
      p_trend_velocity,
      p_trend_size,
      p_ai_angle,
      'submitted',
      v_base_xp -- will calculate multipliers async
    ) RETURNING id INTO v_trend_id;

    -- 2. Get user's current XP and level (quick lookup)
    SELECT 
      COALESCE(total_xp, 0),
      CASE 
        WHEN COALESCE(total_xp, 0) < 100 THEN 1
        WHEN COALESCE(total_xp, 0) < 250 THEN 2
        WHEN COALESCE(total_xp, 0) < 500 THEN 3
        WHEN COALESCE(total_xp, 0) < 1000 THEN 4
        WHEN COALESCE(total_xp, 0) < 2000 THEN 5
        ELSE 6
      END
    INTO v_total_xp, v_level
    FROM user_xp
    WHERE user_id = p_user_id;

    -- 3. Update or create user profile (simplified)
    INSERT INTO user_profiles (
      id,
      username,
      email,
      performance_tier,
      total_submitted,
      last_submission_at
    ) VALUES (
      p_user_id,
      'user_' || substring(p_user_id::text, 1, 8),
      NULL,
      'BRONZE',
      1,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_submitted = user_profiles.total_submitted + 1,
      last_submission_at = NOW();

    -- 4. Award base XP (multipliers calculated async)
    INSERT INTO xp_transactions (
      user_id,
      amount,
      type,
      description,
      reference_id,
      reference_type
    ) VALUES (
      p_user_id,
      v_base_xp,
      'trend_submission',
      'Submitted: ' || p_title,
      v_trend_id,
      'trend_submission'
    );

    -- 5. Update user XP total
    INSERT INTO user_xp (user_id, total_xp)
    VALUES (p_user_id, v_base_xp)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_xp.total_xp + v_base_xp;

    -- 6. Create earnings entry (handled by trigger, but we'll do it here for speed)
    INSERT INTO earnings (
      user_id,
      trend_submission_id,
      amount,
      status,
      type
    ) VALUES (
      p_user_id,
      v_trend_id,
      v_base_xp,
      'pending',
      'trend_submission'
    );

    -- Build success response
    v_result := json_build_object(
      'success', true,
      'trend_id', v_trend_id,
      'xp_earned', v_base_xp,
      'level', v_level,
      'total_xp', v_total_xp + v_base_xp
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in a function
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$;