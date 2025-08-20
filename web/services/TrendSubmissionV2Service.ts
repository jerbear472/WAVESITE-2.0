import { supabase } from '@/lib/supabase';

export interface TrendSubmissionV2Data {
  // Required fields
  url: string;
  lifecycleStage: string;
  trendType: string;
  
  // Auto-extracted
  title?: string;
  thumbnailUrl?: string;
  platform?: string;
  
  // Optional fields for bonus XP
  isEvolution?: boolean;
  parentTrends?: string[];
  peakDate?: string;
  nextPlatform?: string;
  lifespanValue?: number;
  lifespanUnit?: string;
  contextNote?: string;
  
  // Metadata
  creatorHandle?: string;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  hashtags?: string[];
}

export class TrendSubmissionV2Service {
  /**
   * Submit a new trend with enhanced metadata
   */
  static async submitTrend(userId: string, data: TrendSubmissionV2Data) {
    try {
      console.log('Submitting trend V2:', data);
      
      // Calculate XP based on filled fields
      const xp = this.calculateXP(data);
      
      // Prepare submission payload
      const submissionPayload = {
        spotter_id: userId,
        
        // Required fields
        post_url: data.url,
        lifecycle_stage: data.lifecycleStage,
        trend_type: data.trendType,
        
        // Basic info
        title: data.title || 'Untitled Trend',
        description: data.contextNote || data.title || 'No description',
        platform: data.platform,
        thumbnail_url: data.thumbnailUrl,
        
        // Evolution tracking
        is_evolution: data.isEvolution || false,
        parent_trends: data.parentTrends || [],
        
        // Predictions
        peak_date: data.peakDate,
        next_platform: data.nextPlatform,
        lifespan_value: data.lifespanValue,
        lifespan_unit: data.lifespanUnit,
        
        // Context
        context_note: data.contextNote,
        
        // Social metrics
        creator_handle: data.creatorHandle,
        views_count: data.viewsCount || 0,
        likes_count: data.likesCount || 0,
        comments_count: data.commentsCount || 0,
        shares_count: data.sharesCount || 0,
        hashtags: data.hashtags || [],
        
        // Scoring
        wave_score: Math.min(100, xp), // Cap at 100
        quality_score: 0.75, // Default quality
        
        // Status
        status: 'submitted',
        
        // Store all data in evidence for backward compatibility
        evidence: {
          ...data,
          calculated_xp: xp,
          submission_version: 'v2'
        }
      };
      
      // Insert the submission
      const { data: submission, error } = await supabase
        .from('trend_submissions')
        .insert(submissionPayload)
        .select()
        .single();
      
      if (error) {
        console.error('Submission error:', error);
        throw error;
      }
      
      console.log('Trend submitted successfully:', submission);
      
      // Track the submission in user activity
      await this.trackUserActivity(userId, submission.id, xp);
      
      return {
        success: true,
        submission,
        xp
      };
      
    } catch (error: any) {
      console.error('TrendSubmissionV2Service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit trend'
      };
    }
  }
  
  /**
   * Calculate XP based on filled fields
   */
  static calculateXP(data: TrendSubmissionV2Data): number {
    let xp = 0;
    
    // Base submission
    if (data.url && data.lifecycleStage && data.trendType) {
      xp += 25;
    }
    
    // Evolution tracking
    if (data.isEvolution) {
      xp += 50;
      if (data.parentTrends && data.parentTrends.length > 0) {
        xp += Math.min(data.parentTrends.length * 100, 500);
      }
    }
    
    // Predictions
    if (data.peakDate || data.nextPlatform || data.lifespanValue) {
      xp += 20;
    }
    
    // Context note
    if (data.contextNote && data.contextNote.length > 10) {
      xp += 5;
    }
    
    return xp;
  }
  
  /**
   * Track user activity for gamification
   */
  static async trackUserActivity(userId: string, trendId: string, xp: number) {
    try {
      // Update user's total XP
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          total_xp: supabase.raw('total_xp + ?', [xp]),
          trends_submitted: supabase.raw('trends_submitted + 1'),
          last_submission_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (profileError) {
        console.warn('Failed to update user profile:', profileError);
      }
      
      // Log the activity
      const { error: activityError } = await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          activity_type: 'trend_submission',
          metadata: {
            trend_id: trendId,
            xp_earned: xp,
            version: 'v2'
          }
        });
      
      if (activityError) {
        console.warn('Failed to log activity:', activityError);
      }
      
    } catch (error) {
      console.warn('Failed to track user activity:', error);
      // Don't throw - this is non-critical
    }
  }
  
  /**
   * Search for existing trends (for parent linking)
   */
  static async searchTrends(query: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .rpc('search_trends_for_linking', {
          p_query: query,
          p_limit: limit
        });
      
      if (error) throw error;
      
      return {
        success: true,
        trends: data || []
      };
      
    } catch (error: any) {
      console.error('Search trends error:', error);
      return {
        success: false,
        trends: [],
        error: error.message
      };
    }
  }
  
  /**
   * Get trend evolution chain
   */
  static async getTrendEvolutionChain(trendId: string) {
    try {
      const { data, error } = await supabase
        .from('trend_evolution_chains')
        .select('*')
        .or(`trend_id.eq.${trendId},parent_id.eq.${trendId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        chain: data || []
      };
      
    } catch (error: any) {
      console.error('Get evolution chain error:', error);
      return {
        success: false,
        chain: [],
        error: error.message
      };
    }
  }
  
  /**
   * Validate parent trends exist
   */
  static async validateParentTrends(trendIds: string[]): Promise<boolean> {
    if (!trendIds || trendIds.length === 0) return true;
    
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('id')
        .in('id', trendIds);
      
      if (error) throw error;
      
      return data?.length === trendIds.length;
      
    } catch (error) {
      console.error('Validate parent trends error:', error);
      return false;
    }
  }
}