import { supabase } from './supabase';
import { XP_REWARDS, getCurrentLevel } from './XP_REWARDS';
import { getSafeCategory } from './safeCategory';
import { calculateXPWithMultipliers, isWithinSessionWindow } from './calculateXPWithMultipliers';

export interface TrendSubmissionData {
  url?: string;
  title?: string;
  description?: string;
  category?: string;
  platform?: string;
  trendVelocity?: string;
  trendSize?: string;
  sentiment?: number;
  audienceAge?: string[];
  categoryAnswers?: any;
  velocityMetrics?: any;
  aiAngle?: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  creator_handle?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  hashtags?: string[];
  wave_score?: number;
}

export async function submitTrend(userId: string, data: TrendSubmissionData) {
  const startTime = Date.now();
  console.log('📤 [START] Submitting trend for user:', userId, 'at', new Date().toISOString());
  
  try {
    // First, test database connection
    console.log('🔌 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      throw new Error('Unable to connect to database. Please try again.');
    }
    console.log('✅ Database connection successful');
    
    // Get user profile for XP calculation with multipliers
    console.log('📊 [1] Fetching user profile for XP calculation...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('performance_tier, current_streak, session_streak, last_submission_at, total_earned')
      .eq('id', userId)
      .single();
    
    // Also get user's current XP for level calculation
    const { data: userXP } = await supabase
      .from('user_xp')
      .select('total_xp')
      .eq('user_id', userId)
      .single();
    
    console.log(`📊 [1] Profile fetch completed in ${Date.now() - startTime}ms`);
    
    if (profileError) {
      console.log('Profile lookup error:', profileError);
    }
    
    // Calculate XP with all multipliers
    const baseXP = XP_REWARDS.base.trendSubmission; // 10 XP
    const totalXP = userXP?.total_xp || 0;
    const levelData = getCurrentLevel(totalXP);
    const currentLevel = levelData.level;
    const dailyStreak = profile?.current_streak || 0;
    const sessionStreak = profile?.session_streak || 0;
    const lastSubmission = profile?.last_submission_at;
    const withinSession = isWithinSessionWindow(lastSubmission);
    
    const xpCalculation = calculateXPWithMultipliers({
      baseAmount: baseXP,
      totalXP: totalXP,
      currentLevel: currentLevel,
      dailyStreak: dailyStreak,
      sessionStreak: withinSession ? sessionStreak : 0,
      isWithinSessionWindow: withinSession
    });
    
    const paymentAmount = xpCalculation.finalXP;
    
    console.log('💎 XP Calculation:', {
      base: xpCalculation.baseXP,
      level: `${currentLevel} (${xpCalculation.levelMultiplier}x)`,
      dailyStreak: `${dailyStreak} days (${xpCalculation.dailyStreakMultiplier}x)`,
      sessionStreak: withinSession ? `${sessionStreak + 1} (${xpCalculation.sessionStreakMultiplier}x)` : 'new session',
      totalMultiplier: xpCalculation.totalMultiplier,
      finalXP: paymentAmount
    });
    
    // Prepare submission data - only include essential columns first
    const submissionData: any = {
      spotter_id: userId,  // Use spotter_id as that's what the table expects
      category: getSafeCategory(data.category),
      description: (data.description && data.description !== '0') ? data.description : 
                   (data.title && data.title !== '0') ? data.title : 'Untitled Trend',
      status: 'submitted',
      payment_amount: paymentAmount
    };

    // Add optional fields if they exist and are not undefined
    if (data.title && data.title !== '0') submissionData.title = data.title;
    if (data.platform) submissionData.platform = data.platform;
    if (data.url) submissionData.post_url = data.url;
    if (data.screenshot_url) submissionData.screenshot_url = data.screenshot_url;
    if (data.thumbnail_url) submissionData.thumbnail_url = data.thumbnail_url;
    if (data.creator_handle) submissionData.creator_handle = data.creator_handle;
    
    // Add numeric fields with defaults
    submissionData.views_count = data.views_count || 0;
    submissionData.likes_count = data.likes_count || 0;
    submissionData.comments_count = data.comments_count || 0;
    submissionData.quality_score = 75;
    submissionData.wave_score = data.wave_score || data.sentiment || 50;
    
    // Add arrays only if they have content
    if (data.hashtags && data.hashtags.length > 0) {
      submissionData.hashtags = data.hashtags;
    }
    
    // Only add intelligence fields if they exist in the data
    if (data.trendVelocity) submissionData.trend_velocity = data.trendVelocity;
    if (data.trendSize) submissionData.trend_size = data.trendSize;
    if (data.aiAngle) submissionData.ai_angle = data.aiAngle;
    if (data.sentiment) submissionData.sentiment = data.sentiment;
    if (data.audienceAge && data.audienceAge.length > 0) {
      submissionData.audience_age = data.audienceAge;
    }
    
    // Only add JSON fields if they have content
    if (data.categoryAnswers && Object.keys(data.categoryAnswers).length > 0) {
      submissionData.category_answers = data.categoryAnswers;
    }
    if (data.velocityMetrics && Object.keys(data.velocityMetrics).length > 0) {
      submissionData.velocity_metrics = data.velocityMetrics;
    }
    
    // Remove evidence field - might be causing issues
    // submissionData.evidence = {
    //   url: data.url || '',
    //   title: data.title || 'Untitled Trend',
    //   payment_amount: paymentAmount
    // };
    
    console.log(`💾 [2] Saving to database at ${Date.now() - startTime}ms...`);
    console.log('Submission data keys:', Object.keys(submissionData));
    console.log('Full submission data:', JSON.stringify(submissionData, null, 2));
    
    // Insert the trend submission with timeout
    const insertPromise = supabase
      .from('trend_submissions')
      .insert(submissionData)
      .select()
      .single();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database insert timeout after 10 seconds')), 10000)
    );
    
    const { data: submission, error: submitError } = await Promise.race([
      insertPromise,
      timeoutPromise
    ]) as any;
    
    console.log(`💾 [2] Database insert completed in ${Date.now() - startTime}ms`);
    
    if (submitError) {
      console.error('❌ Submission error:', submitError);
      console.error('❌ Error details:', {
        message: submitError.message,
        details: submitError.details,
        hint: submitError.hint,
        code: submitError.code
      });
      
      // Provide more specific error message based on error type
      if (submitError.message?.includes('duplicate key')) {
        throw new Error('You have already submitted this trend');
      } else if (submitError.message?.includes('foreign key')) {
        throw new Error('Authentication error. Please log in again.');
      } else if (submitError.message?.includes('column')) {
        console.error('Missing column error. Attempted to insert:', submissionData);
        throw new Error('Database schema error. Please contact support.');
      } else {
        throw submitError;
      }
    }
    
    console.log('✅ Trend submitted:', submission?.id);
    
    // Update scroll session tracking
    if (submission?.id) {
      console.log('📊 Updating scroll session...');
      try {
        // Call the database function to update session and apply multipliers with timeout
        const rpcPromise = supabase
          .rpc('update_session_on_trend_submission', {
            p_user_id: userId,
            p_trend_id: submission.id
          });
        
        const rpcTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RPC timeout after 5 seconds')), 5000)
        );
        
        const { data: sessionData, error: sessionError } = await Promise.race([
          rpcPromise,
          rpcTimeoutPromise
        ]) as any;
        
        if (sessionError) {
          console.warn('Failed to update scroll session:', sessionError);
        } else {
          console.log('✅ Scroll session updated');
        }
      } catch (error) {
        console.warn('Session tracking error:', error);
        // Don't fail the submission if session tracking fails
      }
    }
    
    // Award XP for trend submission
    try {
      console.log('🎯 Awarding XP for trend submission...');
      const { data: xpData, error: xpError } = await supabase
        .rpc('award_xp', {
          p_user_id: userId,
          p_amount: paymentAmount,
          p_reason: 'trend_submission',
          p_metadata: { trend_id: submission.id }
        });
      
      if (xpError) {
        console.warn('Failed to award XP:', xpError);
        // Don't fail the submission if XP awarding fails
      } else {
        console.log('✅ XP awarded successfully:', xpData);
      }
    } catch (xpError) {
      console.warn('XP awarding error:', xpError);
      // Continue even if XP fails
    }
    
    // NOTE: Earnings entry is now created by database trigger
    // Removing manual creation to prevent duplicate entries
    console.log('💰 Earnings will be created by database trigger');
    
    console.log(`✅ [COMPLETE] Total time: ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      submission,
      earnings: paymentAmount
    };
    
  } catch (error: any) {
    console.error(`❌ [ERROR] Submit trend error after ${Date.now() - startTime}ms:`, error);
    return {
      success: false,
      error: error.message || 'Failed to submit trend'
    };
  }
}