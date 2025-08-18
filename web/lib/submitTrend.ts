import { supabase } from './supabase';
import { calculateTrendEarnings } from './SUSTAINABLE_EARNINGS';
import { getSafeCategory } from './safeCategory';

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
    
    // Get user profile for earnings calculation
    // Use 'id' column which matches auth.users.id
    console.log('📊 [1] Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('performance_tier, current_streak, session_streak')
      .eq('id', userId)
      .single();
    
    console.log(`📊 [1] Profile fetch completed in ${Date.now() - startTime}ms`);
    
    if (profileError) {
      console.log('Profile lookup error:', profileError);
    }
    
    // Calculate earnings
    const userProfile = {
      user_id: userId,
      performance_tier: profile?.performance_tier || 'learning',
      current_balance: 0,
      total_earned: 0,
      trends_submitted: 0,
      approval_rate: 0.5,
      quality_score: 0.5,
      current_streak: profile?.current_streak || 0,
      session_streak: profile?.session_streak || 0,
      last_submission_at: undefined
    };
    
    const earningsCalc = calculateTrendEarnings(null, userProfile as any);
    const paymentAmount = earningsCalc.total || 0.25;
    
    // Prepare submission data - only include columns that exist
    const submissionData = {
      spotter_id: userId,  // Use spotter_id as that's what the table expects
      category: getSafeCategory(data.category),
      description: data.description || data.title || 'Untitled Trend',
      title: data.title || 'Untitled Trend',
      status: 'submitted',
      payment_amount: paymentAmount,
      
      // Optional fields
      platform: data.platform,
      post_url: data.url,
      screenshot_url: data.screenshot_url,
      thumbnail_url: data.thumbnail_url,
      creator_handle: data.creator_handle,
      views_count: data.views_count || 0,
      likes_count: data.likes_count || 0,
      comments_count: data.comments_count || 0,
      hashtags: data.hashtags || [],
      wave_score: data.wave_score || data.sentiment || 50,
      quality_score: 75,
      
      // Intelligence fields
      trend_velocity: data.trendVelocity || 'just_starting',
      trend_size: data.trendSize || 'niche',
      ai_angle: data.aiAngle || 'not_ai',
      sentiment: data.sentiment || 50,
      audience_age: data.audienceAge,
      category_answers: data.categoryAnswers,
      velocity_metrics: data.velocityMetrics,
      is_ai_generated: data.aiAngle && data.aiAngle !== 'not_ai',
      
      // Evidence for backwards compatibility
      evidence: {
        ...data,
        payment_amount: paymentAmount
      }
    };
    
    console.log(`💾 [2] Saving to database at ${Date.now() - startTime}ms...`);
    console.log('Submission data keys:', Object.keys(submissionData));
    
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
      throw submitError;
    }
    
    console.log('✅ Trend submitted:', submission?.id);
    
    // Update scroll session tracking
    if (submission?.id) {
      console.log('📊 Updating scroll session...');
      try {
        // Call the database function to update session and apply multipliers
        const { data: sessionData, error: sessionError } = await supabase
          .rpc('update_session_on_trend_submission', {
            p_user_id: userId,
            p_trend_id: submission.id
          });
        
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