import { supabase } from '@/lib/supabase';
import { SUSTAINABLE_EARNINGS } from '@/lib/SUSTAINABLE_EARNINGS';

interface ValidationVote {
  trendId: string;
  vote: boolean; // true = approve, false = reject
  qualityScore?: number;
  feedback?: string;
}

interface ValidationResponse {
  success: boolean;
  data?: {
    trendStatus: string;
    validationCount: number;
    approveCount: number;
    rejectCount: number;
    earned: number;
    message?: string;
  };
  error?: string;
}

interface TrendForValidation {
  id: string;
  category: string;
  description: string;
  screenshot_url?: string;
  platform?: string;
  creator_handle?: string;
  post_caption?: string;
  hashtags?: string[];
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  validation_count: number;
  approve_count: number;
  reject_count: number;
  spotter_id: string;
  created_at: string;
}

export class ReliableValidationService {
  private static instance: ReliableValidationService;
  private validationInProgress: Set<string> = new Set();
  private validationCache: Map<string, Set<string>> = new Map(); // userId -> trendIds voted

  private constructor() {
    // Clear cache periodically (every 5 minutes)
    setInterval(() => this.clearOldCache(), 5 * 60 * 1000);
  }

  static getInstance(): ReliableValidationService {
    if (!this.instance) {
      this.instance = new ReliableValidationService();
    }
    return this.instance;
  }

  /**
   * Get trends available for validation
   */
  async getTrendsForValidation(userId: string, limit = 10): Promise<{
    success: boolean;
    trends?: TrendForValidation[];
    error?: string;
  }> {
    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      // Get user's voted trend IDs from cache or database
      let votedTrendIds = this.validationCache.get(userId);
      if (!votedTrendIds) {
        const { data: validations } = await supabase
          .from('trend_validations')
          .select('trend_id')
          .eq('validator_id', userId);
        
        votedTrendIds = new Set(validations?.map(v => v.trend_id) || []);
        this.validationCache.set(userId, votedTrendIds);
      }

      // Fetch trends for validation
      const { data: trends, error } = await supabase
        .from('trend_submissions')
        .select(`
          id, category, description, screenshot_url, platform,
          creator_handle, post_caption, hashtags,
          likes_count, comments_count, shares_count, views_count,
          validation_count, approve_count, reject_count,
          spotter_id, created_at
        `)
        .in('status', ['submitted', 'validating'])
        .neq('spotter_id', userId) // Can't validate own trends
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get extra to filter out voted ones

      if (error) {
        console.error('Failed to fetch trends:', error);
        return { success: false, error: 'Failed to load trends' };
      }

      // Filter out already voted trends
      const availableTrends = (trends || [])
        .filter(trend => !votedTrendIds?.has(trend.id))
        .slice(0, limit);

      return {
        success: true,
        trends: availableTrends
      };
    } catch (error: any) {
      console.error('Get trends error:', error);
      return {
        success: false,
        error: 'Failed to load trends for validation'
      };
    }
  }

  /**
   * Cast a validation vote
   */
  async castVote(vote: ValidationVote, userId: string): Promise<ValidationResponse> {
    const voteKey = `${userId}-${vote.trendId}`;
    
    // Prevent duplicate voting attempts
    if (this.validationInProgress.has(voteKey)) {
      return {
        success: false,
        error: 'Vote already in progress'
      };
    }

    this.validationInProgress.add(voteKey);

    try {
      // Validate input
      if (!vote.trendId) {
        return { success: false, error: 'Invalid trend ID' };
      }

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== userId) {
        return { success: false, error: 'Authentication required' };
      }

      // Check if already voted (double-check)
      const { data: existingVote } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('trend_id', vote.trendId)
        .eq('validator_id', userId)
        .single();

      if (existingVote) {
        return { success: false, error: 'You have already voted on this trend' };
      }

      // Get trend details
      const { data: trend, error: trendError } = await supabase
        .from('trend_submissions')
        .select('spotter_id, status, validation_count, approve_count, reject_count')
        .eq('id', vote.trendId)
        .single();

      if (trendError || !trend) {
        return { success: false, error: 'Trend not found' };
      }

      // Prevent self-validation
      if (trend.spotter_id === userId) {
        return { success: false, error: 'Cannot validate your own trend' };
      }

      // Check if trend is still open for validation
      if (!['submitted', 'validating'].includes(trend.status)) {
        return { success: false, error: 'This trend is no longer open for validation' };
      }

      // Use database function for atomic vote casting
      const { data: result, error: voteError } = await supabase.rpc('cast_trend_vote', {
        p_trend_id: vote.trendId,
        p_validator_id: userId,
        p_vote: vote.vote,
        p_quality_score: vote.qualityScore || null,
        p_feedback: vote.feedback || null
      });

      if (voteError) {
        console.error('Vote casting error:', voteError);
        return {
          success: false,
          error: this.getVoteErrorMessage(voteError)
        };
      }

      // Update cache
      const userCache = this.validationCache.get(userId) || new Set();
      userCache.add(vote.trendId);
      this.validationCache.set(userId, userCache);

      // Parse result from database function
      const voteResult = result as any;
      if (!voteResult.success) {
        return {
          success: false,
          error: voteResult.error || 'Failed to cast vote'
        };
      }

      return {
        success: true,
        data: {
          trendStatus: voteResult.trend_status,
          validationCount: voteResult.validation_count,
          approveCount: voteResult.approve_count,
          rejectCount: voteResult.reject_count,
          earned: voteResult.validator_earned || SUSTAINABLE_EARNINGS.base.validationVote,
          message: this.getSuccessMessage(vote.vote, voteResult.trend_status)
        }
      };
    } catch (error: any) {
      console.error('Validation error:', error);
      return {
        success: false,
        error: 'Failed to submit validation. Please try again.'
      };
    } finally {
      this.validationInProgress.delete(voteKey);
    }
  }

  /**
   * Get validation statistics for a user
   */
  async getValidationStats(userId: string): Promise<{
    success: boolean;
    stats?: {
      totalValidations: number;
      todayValidations: number;
      accuracyRate: number;
      earningsToday: number;
      earningsTotal: number;
    };
    error?: string;
  }> {
    try {
      // Get total validations
      const { count: totalValidations } = await supabase
        .from('trend_validations')
        .select('*', { count: 'exact', head: true })
        .eq('validator_id', userId);

      // Get today's validations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayValidations } = await supabase
        .from('trend_validations')
        .select('*', { count: 'exact', head: true })
        .eq('validator_id', userId)
        .gte('created_at', today.toISOString());

      // Get user profile for earnings
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('validation_score, daily_earnings, total_earnings')
        .eq('id', userId)
        .single();

      // Calculate accuracy rate (simplified - would need more complex logic in production)
      const accuracyRate = profile?.validation_score || 0;

      return {
        success: true,
        stats: {
          totalValidations: totalValidations || 0,
          todayValidations: todayValidations || 0,
          accuracyRate: Math.round(accuracyRate),
          earningsToday: (todayValidations || 0) * SUSTAINABLE_EARNINGS.base.validationVote,
          earningsTotal: profile?.total_earnings || 0
        }
      };
    } catch (error) {
      console.error('Stats error:', error);
      return {
        success: false,
        error: 'Failed to load validation statistics'
      };
    }
  }

  /**
   * Skip a trend (mark as seen but not voted)
   */
  async skipTrend(trendId: string, userId: string): Promise<void> {
    // Add to cache so it won't be shown again in this session
    const userCache = this.validationCache.get(userId) || new Set();
    userCache.add(trendId);
    this.validationCache.set(userId, userCache);
  }

  private getVoteErrorMessage(error: any): string {
    const message = error.message || '';
    
    if (message.includes('already voted')) {
      return 'You have already voted on this trend';
    }
    if (message.includes('not found')) {
      return 'This trend no longer exists';
    }
    if (message.includes('self-validation')) {
      return 'You cannot validate your own trends';
    }
    if (message.includes('closed')) {
      return 'This trend is no longer accepting validations';
    }
    
    return 'Failed to submit your vote. Please try again.';
  }

  private getSuccessMessage(vote: boolean, status: string): string {
    if (status === 'approved') {
      return 'Trend approved! You earned $0.02 for your validation.';
    }
    if (status === 'rejected') {
      return 'Trend rejected. You earned $0.02 for your validation.';
    }
    
    return vote 
      ? 'Vote recorded! You approved this trend and earned $0.02.'
      : 'Vote recorded! You rejected this trend and earned $0.02.';
  }

  private clearOldCache(): void {
    // Clear cache entries older than 30 minutes
    // In a production app, you'd want more sophisticated cache management
    if (this.validationCache.size > 100) {
      this.validationCache.clear();
    }
  }

  /**
   * Check if the validation service is healthy
   */
  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Test database connection
      const { error } = await supabase
        .from('trend_validations')
        .select('id')
        .limit(1);
      
      if (error) {
        return { healthy: false, message: 'Database connection issue' };
      }

      // Test auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { healthy: false, message: 'Authentication service issue' };
      }

      return { healthy: true, message: 'Validation service operational' };
    } catch (error) {
      return { healthy: false, message: 'Validation service health check failed' };
    }
  }
}