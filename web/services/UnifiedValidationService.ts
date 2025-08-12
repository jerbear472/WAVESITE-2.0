import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UNIFIED_EARNINGS, formatEarnings } from '@/lib/UNIFIED_EARNINGS_CONFIG';

interface ValidationResult {
  success: boolean;
  message: string;
  earnings?: number;
  trendStatus?: 'pending' | 'approved' | 'rejected';
  error?: string;
}

interface ValidationVote {
  trendId: string;
  vote: 'approve' | 'reject';
  feedback?: string;
  quality_score?: number;
}

export class UnifiedValidationService {
  private supabase;
  private voteCache: Map<string, Set<string>> = new Map(); // userId -> trendIds voted
  private APPROVAL_THRESHOLD = 2; // Number of votes needed to approve/reject
  
  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Submit a validation vote
   */
  async submitVote(vote: ValidationVote): Promise<ValidationResult> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          message: 'Please log in to validate trends',
          error: 'Not authenticated',
        };
      }

      // Check if user has already voted
      const hasVoted = await this.hasUserVoted(user.id, vote.trendId);
      if (hasVoted) {
        return {
          success: false,
          message: 'You have already validated this trend',
          error: 'Duplicate vote',
        };
      }

      // Check if user owns the trend
      const isOwner = await this.isUserTrendOwner(user.id, vote.trendId);
      if (isOwner) {
        return {
          success: false,
          message: 'You cannot validate your own trends',
          error: 'Self-validation',
        };
      }

      // Submit the vote
      const { data: validation, error: voteError } = await this.supabase
        .from('trend_validations')
        .insert([{
          trend_id: vote.trendId,
          user_id: user.id,
          vote: vote.vote,
          feedback: vote.feedback,
          quality_score: vote.quality_score,
        }])
        .select()
        .single();

      if (voteError) {
        console.error('Vote submission error:', voteError);
        return {
          success: false,
          message: 'Failed to submit validation',
          error: voteError.message,
        };
      }

      // Add to cache
      this.addToCache(user.id, vote.trendId);

      // Check if trend has reached decision threshold
      const trendStatus = await this.checkTrendStatus(vote.trendId);

      // Get earnings amount
      const earnings = UNIFIED_EARNINGS.base.validationVote;

      return {
        success: true,
        message: `Validation submitted! You earned ${formatEarnings(earnings)}`,
        earnings,
        trendStatus,
      };
    } catch (error: any) {
      console.error('Validation error:', error);
      return {
        success: false,
        message: 'Failed to process validation',
        error: error.message,
      };
    }
  }

  /**
   * Check if user has already voted on a trend
   */
  private async hasUserVoted(userId: string, trendId: string): Promise<boolean> {
    // Check cache first
    const userVotes = this.voteCache.get(userId);
    if (userVotes?.has(trendId)) {
      return true;
    }

    // Check database
    const { data, error } = await this.supabase
      .from('trend_validations')
      .select('id')
      .eq('user_id', userId)
      .eq('trend_id', trendId)
      .limit(1);

    const hasVoted = !error && data && data.length > 0;
    
    // Update cache if voted
    if (hasVoted) {
      this.addToCache(userId, trendId);
    }

    return hasVoted;
  }

  /**
   * Check if user owns the trend
   */
  private async isUserTrendOwner(userId: string, trendId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('captured_trends')
      .select('user_id')
      .eq('id', trendId)
      .single();

    return !error && data?.user_id === userId;
  }

  /**
   * Check trend status after vote
   */
  private async checkTrendStatus(trendId: string): Promise<'pending' | 'approved' | 'rejected'> {
    // Get vote counts
    const { data: voteCounts, error } = await this.supabase
      .from('trend_validations')
      .select('vote')
      .eq('trend_id', trendId);

    if (error || !voteCounts) {
      return 'pending';
    }

    const approvals = voteCounts.filter(v => v.vote === 'approve').length;
    const rejections = voteCounts.filter(v => v.vote === 'reject').length;

    // Check if decision threshold reached
    if (approvals >= this.APPROVAL_THRESHOLD) {
      // Update trend status to approved
      await this.updateTrendStatus(trendId, 'approved', approvals, rejections);
      return 'approved';
    } else if (rejections >= this.APPROVAL_THRESHOLD) {
      // Update trend status to rejected
      await this.updateTrendStatus(trendId, 'rejected', approvals, rejections);
      return 'rejected';
    }

    return 'pending';
  }

  /**
   * Update trend status in database
   */
  private async updateTrendStatus(
    trendId: string, 
    status: 'approved' | 'rejected',
    approveCount: number,
    rejectCount: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('captured_trends')
      .update({
        validation_status: status,
        approve_count: approveCount,
        reject_count: rejectCount,
        validated_at: new Date().toISOString(),
      })
      .eq('id', trendId);

    if (error) {
      console.error('Failed to update trend status:', error);
    }
  }

  /**
   * Add vote to cache
   */
  private addToCache(userId: string, trendId: string): void {
    if (!this.voteCache.has(userId)) {
      this.voteCache.set(userId, new Set());
    }
    this.voteCache.get(userId)!.add(trendId);
  }

  /**
   * Get trends for user to validate
   */
  async getTrendsToValidate(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // Get user's previously voted trend IDs
      const { data: userVotes } = await this.supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('user_id', userId);

      const votedTrendIds = userVotes?.map(v => v.trend_id) || [];

      // Get pending trends user hasn't voted on and doesn't own
      let query = this.supabase
        .from('captured_trends')
        .select(`
          *,
          user_profiles!captured_trends_user_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq('validation_status', 'pending')
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get extra in case some are filtered

      // Filter out already voted trends
      if (votedTrendIds.length > 0) {
        query = query.not('id', 'in', `(${votedTrendIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch trends for validation:', error);
        return [];
      }

      // Return limited results
      return data?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error fetching trends to validate:', error);
      return [];
    }
  }

  /**
   * Get user's validation history
   */
  async getUserValidationHistory(userId: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('trend_validations')
      .select(`
        *,
        captured_trends(
          title,
          url,
          platform,
          category,
          validation_status,
          thumbnail_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch validation history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get validation statistics for user
   */
  async getUserValidationStats(userId: string): Promise<{
    totalValidations: number;
    approvals: number;
    rejections: number;
    earningsFromValidation: number;
    accuracyRate: number;
  }> {
    // Get all user validations
    const { data: validations, error } = await this.supabase
      .from('trend_validations')
      .select(`
        vote,
        captured_trends(validation_status)
      `)
      .eq('user_id', userId);

    if (error || !validations) {
      return {
        totalValidations: 0,
        approvals: 0,
        rejections: 0,
        earningsFromValidation: 0,
        accuracyRate: 0,
      };
    }

    const totalValidations = validations.length;
    const approvals = validations.filter(v => v.vote === 'approve').length;
    const rejections = validations.filter(v => v.vote === 'reject').length;
    const earningsFromValidation = totalValidations * UNIFIED_EARNINGS.base.validationVote;

    // Calculate accuracy (votes that matched final decision)
    const accurateVotes = validations.filter(v => {
      const trend = v.captured_trends as any;
      if (!trend || trend.validation_status === 'pending') return false;
      return (v.vote === 'approve' && trend.validation_status === 'approved') ||
             (v.vote === 'reject' && trend.validation_status === 'rejected');
    }).length;

    const decidedTrends = validations.filter(v => {
      const trend = v.captured_trends as any;
      return trend && trend.validation_status !== 'pending';
    }).length;

    const accuracyRate = decidedTrends > 0 ? (accurateVotes / decidedTrends) * 100 : 0;

    return {
      totalValidations,
      approvals,
      rejections,
      earningsFromValidation,
      accuracyRate,
    };
  }

  /**
   * Batch validate multiple trends (for power users)
   */
  async batchValidate(votes: ValidationVote[]): Promise<{
    successful: number;
    failed: number;
    totalEarnings: number;
    results: ValidationResult[];
  }> {
    const results: ValidationResult[] = [];
    let successful = 0;
    let failed = 0;
    let totalEarnings = 0;

    for (const vote of votes) {
      const result = await this.submitVote(vote);
      results.push(result);
      
      if (result.success) {
        successful++;
        totalEarnings += result.earnings || 0;
      } else {
        failed++;
      }
    }

    return {
      successful,
      failed,
      totalEarnings,
      results,
    };
  }
}

export default UnifiedValidationService;