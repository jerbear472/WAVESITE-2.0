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
  try {
    console.log('📤 Submitting trend for user:', userId);
    
    // Get user profile for earnings calculation
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('performance_tier, current_streak, session_streak')
      .eq('id', userId)
      .single();
    
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
    
    console.log('💾 Saving to database...');
    
    // Insert the trend submission
    const { data: submission, error: submitError } = await supabase
      .from('trend_submissions')
      .insert(submissionData)
      .select()
      .single();
    
    if (submitError) {
      console.error('❌ Submission error:', submitError);
      throw submitError;
    }
    
    console.log('✅ Trend submitted:', submission.id);
    
    // Manually create earnings entry (in case trigger doesn't exist)
    try {
      const { error: earningsError } = await supabase
        .from('earnings_ledger')
        .insert({
          user_id: userId,
          amount: paymentAmount,
          type: 'trend_submission',
          transaction_type: 'trend_submission',
          status: 'pending',
          description: `Trend: ${data.title || 'Untitled'}`,
          reference_id: submission.id,
          reference_type: 'trend_submissions',
          metadata: {
            base_amount: 0.25,
            tier: profile?.performance_tier || 'learning',
            tier_multiplier: earningsCalc.tierMultiplier || 1.0,
            session_multiplier: earningsCalc.sessionMultiplier || 1.0,
            daily_multiplier: earningsCalc.dailyMultiplier || 1.0,
            category: getSafeCategory(data.category)
          }
        });
      
      if (earningsError) {
        console.warn('⚠️ Could not create earnings entry (trigger may handle it):', earningsError);
      } else {
        console.log('✅ Earnings entry created');
      }
    } catch (earnErr) {
      console.warn('Earnings entry creation failed (may be handled by trigger)');
    }
    
    return {
      success: true,
      submission,
      earnings: paymentAmount
    };
    
  } catch (error: any) {
    console.error('❌ Submit trend error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit trend'
    };
  }
}