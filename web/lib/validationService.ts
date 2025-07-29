import { supabase } from './supabase';

interface ValidationPattern {
  userId: string;
  recentVotes: Array<{
    vote: 'verify' | 'reject';
    timestamp: Date;
    timeTaken: number;
  }>;
  suspiciousPatterns: string[];
}

export class ValidationAntiGamingService {
  private static instance: ValidationAntiGamingService;
  private validationPatterns: Map<string, ValidationPattern> = new Map();

  static getInstance(): ValidationAntiGamingService {
    if (!this.instance) {
      this.instance = new ValidationAntiGamingService();
    }
    return this.instance;
  }

  /**
   * Check if a validation attempt shows suspicious patterns
   */
  async checkValidationAttempt(
    userId: string,
    vote: 'verify' | 'reject',
    timeTaken: number,
    trendId: string
  ): Promise<{
    isValid: boolean;
    reason?: string;
    requiresCaptcha?: boolean;
  }> {
    // Get or create user pattern
    let userPattern = this.validationPatterns.get(userId);
    if (!userPattern) {
      userPattern = {
        userId,
        recentVotes: [],
        suspiciousPatterns: []
      };
      this.validationPatterns.set(userId, userPattern);
    }

    const now = new Date();
    
    // Add current vote
    userPattern.recentVotes.push({ vote, timestamp: now, timeTaken });
    
    // Keep only last 50 votes
    if (userPattern.recentVotes.length > 50) {
      userPattern.recentVotes.shift();
    }

    // Check for suspicious patterns
    const issues: string[] = [];

    // 1. Too fast validation (less than 3 seconds)
    if (timeTaken < 3) {
      issues.push('validation_too_fast');
    }

    // 2. Repetitive pattern (same vote 10+ times in a row)
    const last10Votes = userPattern.recentVotes.slice(-10);
    if (last10Votes.length === 10 && last10Votes.every(v => v.vote === vote)) {
      issues.push('repetitive_pattern');
    }

    // 3. Bot-like timing (exact intervals)
    if (userPattern.recentVotes.length >= 5) {
      const intervals = [];
      for (let i = 1; i < userPattern.recentVotes.length; i++) {
        const interval = userPattern.recentVotes[i].timestamp.getTime() - 
                        userPattern.recentVotes[i-1].timestamp.getTime();
        intervals.push(interval);
      }
      
      // Check if intervals are suspiciously consistent
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev < 1000 && intervals.length > 3) { // Less than 1 second variance
        issues.push('bot_timing');
      }
    }

    // 4. Alternating pattern detection
    if (userPattern.recentVotes.length >= 20) {
      const recent20 = userPattern.recentVotes.slice(-20);
      let alternating = true;
      for (let i = 1; i < recent20.length; i++) {
        if (recent20[i].vote === recent20[i-1].vote) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        issues.push('alternating_pattern');
      }
    }

    // 5. Check database for cross-session patterns
    const { data: recentValidations } = await supabase
      .from('trend_validations')
      .select('created_at, vote, validation_time_seconds')
      .eq('validator_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (recentValidations && recentValidations.length > 50) {
      // Check for mass voting in short time
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const votesLastHour = recentValidations.filter(
        v => new Date(v.created_at) > oneHourAgo
      );
      
      if (votesLastHour.length > 40) {
        issues.push('excessive_voting_rate');
      }
    }

    // Determine action based on issues
    if (issues.length === 0) {
      return { isValid: true };
    } else if (issues.length === 1 && issues[0] === 'validation_too_fast') {
      // Just a warning for fast validation
      return { 
        isValid: true, 
        reason: 'Please take more time to review trends carefully' 
      };
    } else if (issues.length <= 2) {
      // Require CAPTCHA for moderate suspicion
      return { 
        isValid: true, 
        requiresCaptcha: true,
        reason: 'Unusual pattern detected. Please complete verification.' 
      };
    } else {
      // Block for high suspicion
      await this.flagSuspiciousUser(userId, issues);
      return { 
        isValid: false, 
        reason: 'Suspicious activity detected. Please contact support if you believe this is an error.' 
      };
    }
  }

  /**
   * Flag user for manual review
   */
  private async flagSuspiciousUser(userId: string, patterns: string[]) {
    try {
      await supabase
        .from('flagged_validators')
        .insert({
          user_id: userId,
          flagged_at: new Date().toISOString(),
          patterns_detected: patterns,
          status: 'pending_review'
        });
    } catch (error) {
      console.error('Error flagging user:', error);
    }
  }

  /**
   * ML-based trend pre-filtering
   */
  async shouldShowTrendForValidation(trend: any): Promise<boolean> {
    // Simple heuristic-based filtering for now
    // In production, this would call an ML model
    
    const qualityScore = this.calculateTrendQuality(trend);
    
    // Auto-reject very low quality
    if (qualityScore < 0.2) {
      await this.autoRejectTrend(trend.id, 'low_quality');
      return false;
    }
    
    // Auto-approve very high quality with high engagement
    if (qualityScore > 0.9 && trend.likes_count > 10000) {
      await this.autoApproveTrend(trend.id, 'high_quality_high_engagement');
      return false;
    }
    
    // Show to validators if in the middle range
    return qualityScore >= 0.3 && qualityScore <= 0.8;
  }

  private calculateTrendQuality(trend: any): number {
    let score = 0;
    
    // Has description
    if (trend.description && trend.description.length > 20) score += 0.2;
    
    // Has media
    if (trend.screenshot_url || trend.thumbnail_url) score += 0.2;
    
    // Has engagement data
    if (trend.likes_count || trend.views_count) score += 0.1;
    
    // Has hashtags
    if (trend.hashtags && trend.hashtags.length > 0) score += 0.1;
    
    // Has creator info
    if (trend.creator_handle) score += 0.1;
    
    // Category is valid
    if (trend.category && trend.category !== 'other') score += 0.1;
    
    // Engagement ratio (if available)
    if (trend.likes_count && trend.views_count) {
      const engagementRatio = trend.likes_count / trend.views_count;
      if (engagementRatio > 0.1) score += 0.1;
      if (engagementRatio > 0.2) score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private async autoRejectTrend(trendId: string, reason: string) {
    await supabase
      .from('trend_submissions')
      .update({
        auto_rejected: true,
        stage: 'archived',
        auto_reject_reason: reason
      })
      .eq('id', trendId);
  }

  private async autoApproveTrend(trendId: string, reason: string) {
    await supabase
      .from('trend_submissions')
      .update({
        auto_approved: true,
        stage: 'trending',
        quality_check_required: true,
        auto_approve_reason: reason
      })
      .eq('id', trendId);
  }

  /**
   * Generate quality control trends
   */
  async injectQualityControlTrend(trends: any[]): Promise<any[]> {
    // Randomly inject known trends for quality control
    if (Math.random() < 0.1) { // 10% chance
      const { data: qualityTrend } = await supabase
        .from('quality_control_trends')
        .select('*')
        .eq('is_active', true)
        .order('random()')
        .limit(1)
        .single();
      
      if (qualityTrend) {
        // Insert at random position
        const position = Math.floor(Math.random() * trends.length);
        trends.splice(position, 0, {
          ...qualityTrend,
          is_quality_check: true
        });
      }
    }
    
    return trends;
  }
}

/**
 * Calculate dynamic validation payment
 */
export async function calculateValidationPayment(
  userId: string,
  trendId: string,
  vote: 'verify' | 'reject',
  confidenceScore: number,
  validationTime: number
): Promise<number> {
  // Get user stats
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('validation_reputation, accuracy_score')
    .eq('id', userId)
    .single();
  
  // Get trend info
  const { data: trend } = await supabase
    .from('trend_submissions')
    .select('validation_difficulty, weighted_consensus_score')
    .eq('id', trendId)
    .single();
  
  if (!userProfile || !trend) return 0.05; // Default payment
  
  // Check if vote aligns with consensus (after trend decision)
  const alignedWithConsensus = 
    (vote === 'verify' && trend.weighted_consensus_score > 0) ||
    (vote === 'reject' && trend.weighted_consensus_score < 0);
  
  // Use the database function
  const { data: payment } = await supabase
    .rpc('calculate_validation_payment', {
      p_user_accuracy: userProfile.validation_reputation,
      p_validation_difficulty: trend.validation_difficulty || 1.0,
      p_aligned_with_consensus: alignedWithConsensus,
      p_confidence_score: confidenceScore
    });
  
  return payment || 0.05;
}

/**
 * Real-time consensus data
 */
export async function getRealtimeConsensus(trendId: string) {
  const { data } = await supabase
    .rpc('calculate_weighted_consensus', { p_trend_id: trendId });
  
  if (!data || data.length === 0) {
    return {
      weightedScore: 0,
      totalWeight: 0,
      voteCount: 0,
      confidenceAvg: 0,
      votingVelocity: 0,
      estimatedTimeToDecision: null
    };
  }
  
  const consensus = data[0];
  
  // Calculate voting velocity (votes per hour)
  const { data: recentVotes } = await supabase
    .from('trend_validations')
    .select('created_at')
    .eq('trend_id', trendId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  let votingVelocity = 0;
  if (recentVotes && recentVotes.length > 1) {
    const timeSpan = new Date(recentVotes[0].created_at).getTime() - 
                     new Date(recentVotes[recentVotes.length - 1].created_at).getTime();
    const hoursSpan = timeSpan / (1000 * 60 * 60);
    votingVelocity = recentVotes.length / hoursSpan;
  }
  
  // Estimate time to decision (15 votes needed)
  const votesNeeded = Math.max(0, 15 - consensus.vote_count);
  const estimatedTimeToDecision = votingVelocity > 0 
    ? (votesNeeded / votingVelocity) * 60 // in minutes
    : null;
  
  return {
    weightedScore: consensus.weighted_score,
    totalWeight: consensus.total_weight,
    voteCount: consensus.vote_count,
    confidenceAvg: consensus.confidence_avg,
    votingVelocity,
    estimatedTimeToDecision
  };
}