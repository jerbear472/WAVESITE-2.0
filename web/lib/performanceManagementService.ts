import { supabase } from './supabase';

export type PerformanceTier = 'premium' | 'standard' | 'probation' | 'suspended';

export interface UserPerformanceMetrics {
  verificationAccuracy30d: number;
  trendApprovalRate30d: number;
  compositeScore: number;
  totalVerifications30d: number;
  totalTrends30d: number;
  currentTier: PerformanceTier;
  consecutiveGoodVotes: number;
  paymentMultiplier: number;
  streakBonus: number;
  canSubmitTrends: boolean;
  nextTierThreshold?: {
    tier: PerformanceTier;
    requiredScore: number;
    currentScore: number;
    activitiesNeeded: number;
  };
}

export interface TierBenefits {
  paymentMultiplier: number;
  canSubmitTrends: boolean;
  priorityTrends: boolean;
  displayBadge: string;
  maxDailyValidations: number;
  streakBonusEnabled: boolean;
}

export class PerformanceManagementService {
  private static instance: PerformanceManagementService;

  static getInstance(): PerformanceManagementService {
    if (!this.instance) {
      this.instance = new PerformanceManagementService();
    }
    return this.instance;
  }

  /**
   * Get tier benefits configuration
   */
  getTierBenefits(tier: PerformanceTier): TierBenefits {
    const benefits: Record<PerformanceTier, TierBenefits> = {
      premium: {
        paymentMultiplier: 1.5,
        canSubmitTrends: true,
        priorityTrends: true,
        displayBadge: '⭐ Premium',
        maxDailyValidations: 200,
        streakBonusEnabled: true
      },
      standard: {
        paymentMultiplier: 1.0,
        canSubmitTrends: true,
        priorityTrends: false,
        displayBadge: '✓ Standard',
        maxDailyValidations: 100,
        streakBonusEnabled: true
      },
      probation: {
        paymentMultiplier: 0.5,
        canSubmitTrends: true,
        priorityTrends: false,
        displayBadge: '⚠️ Probation',
        maxDailyValidations: 50,
        streakBonusEnabled: false
      },
      suspended: {
        paymentMultiplier: 0.0,
        canSubmitTrends: false,
        priorityTrends: false,
        displayBadge: '🚫 Suspended',
        maxDailyValidations: 20,
        streakBonusEnabled: false
      }
    };

    return benefits[tier];
  }

  /**
   * Get user's current performance metrics
   */
  async getUserPerformanceMetrics(userId: string): Promise<UserPerformanceMetrics | null> {
    try {
      // Get user profile with performance data - select all to handle missing columns
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError);
        return null;
      }

      // Calculate detailed metrics - handle missing RPC function
      let performanceData: any = {};
      try {
        const { data: metrics } = await supabase
          .rpc('calculate_user_performance_metrics', { p_user_id: userId });
        performanceData = metrics?.[0] || {};
      } catch (rpcError) {
        console.warn('RPC function not available, using defaults:', rpcError);
        performanceData = {};
      }
      const tier = (profile?.performance_tier || 'standard') as PerformanceTier;
      const benefits = this.getTierBenefits(tier);

      // Calculate streak bonus (1% per consecutive good vote, max 20%)
      const streakBonus = Math.min((profile?.consecutive_good_votes || 0) * 0.01, 0.20);

      // Determine next tier threshold
      const nextTierThreshold = this.calculateNextTierThreshold(
        tier,
        profile?.composite_reputation_score || 0.7,
        performanceData.total_verifications_30d + performanceData.total_trends_30d
      );

      return {
        verificationAccuracy30d: performanceData.verification_accuracy_30d || 0,
        trendApprovalRate30d: performanceData.trend_approval_rate_30d || 0,
        compositeScore: profile?.composite_reputation_score || 0.7,
        totalVerifications30d: performanceData.total_verifications_30d || 0,
        totalTrends30d: performanceData.total_trends_30d || 0,
        currentTier: tier,
        consecutiveGoodVotes: profile?.consecutive_good_votes || 0,
        paymentMultiplier: benefits.paymentMultiplier,
        streakBonus: benefits.streakBonusEnabled ? streakBonus : 0,
        canSubmitTrends: benefits.canSubmitTrends && !(profile?.is_permanently_banned),
        nextTierThreshold
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return null;
    }
  }

  /**
   * Calculate what's needed to reach the next tier
   */
  private calculateNextTierThreshold(
    currentTier: PerformanceTier,
    currentScore: number,
    totalActivities: number
  ): UserPerformanceMetrics['nextTierThreshold'] {
    const thresholds = {
      suspended: { tier: 'probation' as PerformanceTier, score: 0.45, minActivities: 10 },
      probation: { tier: 'standard' as PerformanceTier, score: 0.65, minActivities: 20 },
      standard: { tier: 'premium' as PerformanceTier, score: 0.85, minActivities: 50 },
      premium: null // Already at top tier
    };

    const nextTier = thresholds[currentTier];
    if (!nextTier) return undefined;

    return {
      tier: nextTier.tier,
      requiredScore: nextTier.score,
      currentScore: currentScore,
      activitiesNeeded: Math.max(0, nextTier.minActivities - totalActivities)
    };
  }

  /**
   * Calculate payment for a validation with tier multipliers and bonuses
   */
  async calculateTieredPayment(
    userId: string,
    baseAmount: number = 0.05,
    difficultyBonus: number = 0,
    consensusBonus: number = 0
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_tiered_validation_payment', {
          p_user_id: userId,
          p_base_amount: baseAmount,
          p_difficulty_bonus: difficultyBonus,
          p_consensus_bonus: consensusBonus
        });

      if (error) {
        console.error('Error calculating payment:', error);
        return baseAmount; // Fallback to base amount
      }

      return data || baseAmount;
    } catch (error) {
      console.error('Error in payment calculation:', error);
      return baseAmount;
    }
  }

  /**
   * Check if user can submit trends
   */
  async canUserSubmitTrends(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('can_user_submit_trends', { p_user_id: userId });

      if (error) {
        console.error('Error checking trend submission permission:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  }

  /**
   * Get user's performance history
   */
  async getUserPerformanceHistory(
    userId: string,
    days: number = 30
  ): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('user_performance_history')
        .select('*')
        .eq('user_id', userId)
        .gte('period_date', startDate.toISOString())
        .order('period_date', { ascending: false });

      if (error) {
        console.error('Error fetching performance history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  /**
   * Get tier change history
   */
  async getTierChangeHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('tier_change_log')
        .select('*')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching tier history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  /**
   * Trigger performance review for a user
   */
  async triggerPerformanceReview(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('update_user_performance_tier', { p_user_id: userId });

      if (error) {
        console.error('Error triggering performance review:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  }

  /**
   * Get prioritized trends for validation based on user tier
   */
  async getPrioritizedTrends(userId: string, limit: number = 20): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_trends_for_validation', {
          p_user_id: userId,
          p_limit: limit
        });

      if (error) {
        console.error('Error fetching prioritized trends:', error);
        return [];
      }

      return data?.map((item: any) => item.trend_id) || [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  /**
   * Format tier display with benefits
   */
  formatTierDisplay(tier: PerformanceTier): {
    badge: string;
    name: string;
    color: string;
    description: string;
  } {
    const displays = {
      premium: {
        badge: '⭐',
        name: 'Premium Validator',
        color: 'text-yellow-400',
        description: '1.5x payments • Priority trends • Streak bonuses'
      },
      standard: {
        badge: '✓',
        name: 'Standard Validator',
        color: 'text-green-400',
        description: 'Standard payments • Full access • Streak bonuses'
      },
      probation: {
        badge: '⚠️',
        name: 'On Probation',
        color: 'text-orange-400',
        description: '0.5x payments • Limited access • Improve to restore benefits'
      },
      suspended: {
        badge: '🚫',
        name: 'Suspended',
        color: 'text-red-400',
        description: 'No payments • Verification only • 30-day review period'
      }
    };

    return displays[tier];
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(
    type: 'verification' | 'trends' | 'composite' = 'composite',
    limit: number = 10
  ): Promise<any[]> {
    try {
      const orderColumn = {
        verification: 'verification_accuracy_30d',
        trends: 'trend_approval_rate_30d',
        composite: 'composite_reputation_score'
      }[type];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order(orderColumn, { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }
}