import { supabase } from './supabase';

export type SpotterTier = 'elite' | 'verified' | 'learning' | 'restricted';

export interface SpotterPerformanceMetrics {
  trendApprovalRate30d: number;
  trendViralRate30d: number;
  submissionQualityScore: number;
  totalTrendsSubmitted30d: number;
  totalApprovedTrends30d: number;
  earlyDetectionBonus: number;
  currentTier: SpotterTier;
  consecutiveApprovedTrends: number;
  paymentMultiplier: number;
  categoryExpertise: CategoryExpertise[];
  nextTierThreshold?: {
    tier: SpotterTier;
    requiredApprovalRate: number;
    currentApprovalRate: number;
    trendsNeeded: number;
  };
  dailyChallengeProgress?: DailyChallenge;
  achievements: Achievement[];
}

export interface CategoryExpertise {
  category: string;
  level: 'novice' | 'intermediate' | 'expert' | 'master';
  trendsSubmitted: number;
  approvalRate: number;
  bonusMultiplier: number;
}

export interface DailyChallenge {
  id: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  expiresAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: string;
  reward?: {
    type: 'multiplier' | 'bonus' | 'badge';
    value: number | string;
  };
}

export interface TrendQualityMetrics {
  hasScreenshot: boolean;
  hasVideo: boolean;
  descriptionLength: number;
  metadataCompleteness: number;
  categoryRelevance: number;
  duplicateRisk: number;
  viralPotential: number;
  overallQuality: number;
}

export interface SpotterTierBenefits {
  paymentMultiplier: number;
  basePaymentRange: { min: number; max: number };
  canAccessPremiumCategories: boolean;
  dailyTrendLimit: number;
  qualityBonusEnabled: boolean;
  earlyDetectionBonusRate: number;
  displayBadge: string;
}

export class TrendSpotterPerformanceService {
  private static instance: TrendSpotterPerformanceService;

  static getInstance(): TrendSpotterPerformanceService {
    if (!this.instance) {
      this.instance = new TrendSpotterPerformanceService();
    }
    return this.instance;
  }

  /**
   * Get tier benefits configuration
   */
  getTierBenefits(tier: SpotterTier): SpotterTierBenefits {
    const benefits: Record<SpotterTier, SpotterTierBenefits> = {
      elite: {
        paymentMultiplier: 1.5,
        basePaymentRange: { min: 0.12, max: 0.20 },
        canAccessPremiumCategories: true,
        dailyTrendLimit: -1, // Unlimited
        qualityBonusEnabled: true,
        earlyDetectionBonusRate: 0.5, // 50% bonus for early detection
        displayBadge: '🏆 Elite Spotter'
      },
      verified: {
        paymentMultiplier: 1.0,
        basePaymentRange: { min: 0.08, max: 0.15 },
        canAccessPremiumCategories: true,
        dailyTrendLimit: 100,
        qualityBonusEnabled: true,
        earlyDetectionBonusRate: 0.3,
        displayBadge: '✅ Verified Spotter'
      },
      learning: {
        paymentMultiplier: 0.7,
        basePaymentRange: { min: 0.05, max: 0.10 },
        canAccessPremiumCategories: false,
        dailyTrendLimit: 50,
        qualityBonusEnabled: false,
        earlyDetectionBonusRate: 0.1,
        displayBadge: '📚 Learning Spotter'
      },
      restricted: {
        paymentMultiplier: 0.3,
        basePaymentRange: { min: 0.02, max: 0.05 },
        canAccessPremiumCategories: false,
        dailyTrendLimit: 20,
        qualityBonusEnabled: false,
        earlyDetectionBonusRate: 0,
        displayBadge: '⚠️ Restricted'
      }
    };

    return benefits[tier];
  }

  /**
   * Calculate trend quality score
   */
  calculateTrendQuality(trendData: any): TrendQualityMetrics {
    const hasScreenshot = !!(trendData.screenshot || trendData.screenshot_url || trendData.thumbnail_url);
    const hasVideo = !!(trendData.video_url || (trendData.platform === 'tiktok' && trendData.url));
    const descriptionLength = (trendData.explanation || trendData.description || '').length;
    
    // Calculate metadata completeness (0-1)
    const requiredFields = [
      'trendName', 'explanation', 'categories', 'ageRanges', 
      'subcultures', 'region', 'moods', 'spreadSpeed'
    ];
    const filledFields = requiredFields.filter(field => 
      trendData[field] && (Array.isArray(trendData[field]) ? trendData[field].length > 0 : true)
    ).length;
    const metadataCompleteness = filledFields / requiredFields.length;

    // Category relevance (placeholder - would need ML in production)
    const categoryRelevance = 0.8;

    // Duplicate risk (placeholder - would check against existing trends)
    const duplicateRisk = 0.1;

    // Viral potential based on engagement metrics
    const engagementScore = this.calculateEngagementScore(trendData);
    const viralPotential = Math.min(engagementScore / 100, 1);

    // Overall quality score (weighted average)
    const overallQuality = (
      (hasScreenshot ? 0.15 : 0) +
      (hasVideo ? 0.1 : 0) +
      (Math.min(descriptionLength / 200, 1) * 0.15) +
      (metadataCompleteness * 0.25) +
      (categoryRelevance * 0.15) +
      ((1 - duplicateRisk) * 0.1) +
      (viralPotential * 0.1)
    );

    return {
      hasScreenshot,
      hasVideo,
      descriptionLength,
      metadataCompleteness,
      categoryRelevance,
      duplicateRisk,
      viralPotential,
      overallQuality: Math.min(overallQuality, 1)
    };
  }

  /**
   * Calculate engagement score for viral potential
   */
  private calculateEngagementScore(trendData: any): number {
    const likes = trendData.likes_count || 0;
    const comments = trendData.comments_count || 0;
    const shares = trendData.shares_count || 0;
    const views = trendData.views_count || 0;

    // Weighted engagement score
    if (views > 0) {
      const engagementRate = ((likes + comments * 2 + shares * 3) / views) * 100;
      return Math.min(engagementRate * 10, 100); // Cap at 100
    }

    return 0;
  }

  /**
   * Get user's spotter performance metrics
   */
  async getSpotterPerformanceMetrics(userId: string): Promise<SpotterPerformanceMetrics | null> {
    try {
      // Get user profile - with fallback for missing columns
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching spotter profile:', profileError);
        return this.getDefaultMetrics();
      }

      // Get 30-day metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentTrends } = await supabase
        .from('trend_submissions')
        .select('id, status, stage, created_at, category')
        .eq('spotter_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalTrends30d = recentTrends?.length || 0;
      const approvedTrends30d = recentTrends?.filter(t => 
        ['validating', 'trending', 'viral'].includes(t.stage || '')
      ).length || 0;
      const viralTrends30d = recentTrends?.filter(t => t.stage === 'viral').length || 0;

      // Calculate rates
      const approvalRate = totalTrends30d > 0 ? approvedTrends30d / totalTrends30d : 0;
      const viralRate = approvedTrends30d > 0 ? viralTrends30d / approvedTrends30d : 0;

      // Get category expertise
      const categoryExpertise = await this.getCategoryExpertise(userId);

      // Get achievements
      const achievements = await this.getUserAchievements(userId);

      // Get daily challenge
      const dailyChallenge = await this.getDailyChallenge(userId);

      // Determine tier - handle missing column
      const tier = profile?.spotter_tier || this.calculateTier(approvalRate, totalTrends30d);
      const benefits = this.getTierBenefits(tier as SpotterTier);

      // Calculate early detection bonus rate
      const earlyDetectionBonus = benefits.earlyDetectionBonusRate;

      // Next tier threshold
      const nextTierThreshold = this.calculateNextTierThreshold(
        tier as SpotterTier,
        approvalRate,
        totalTrends30d
      );

      return {
        trendApprovalRate30d: approvalRate,
        trendViralRate30d: viralRate,
        submissionQualityScore: profile?.spotter_quality_score || 0.5,
        totalTrendsSubmitted30d: totalTrends30d,
        totalApprovedTrends30d: approvedTrends30d,
        earlyDetectionBonus,
        currentTier: tier as SpotterTier,
        consecutiveApprovedTrends: profile?.consecutive_approved_trends || 0,
        paymentMultiplier: benefits.paymentMultiplier,
        categoryExpertise,
        nextTierThreshold,
        dailyChallengeProgress: dailyChallenge,
        achievements
      };
    } catch (error) {
      console.error('Error getting spotter metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get default metrics for new users
   */
  private getDefaultMetrics(): SpotterPerformanceMetrics {
    return {
      trendApprovalRate30d: 0,
      trendViralRate30d: 0,
      submissionQualityScore: 0.5,
      totalTrendsSubmitted30d: 0,
      totalApprovedTrends30d: 0,
      earlyDetectionBonus: 0.1,
      currentTier: 'learning',
      consecutiveApprovedTrends: 0,
      paymentMultiplier: 0.7,
      categoryExpertise: [],
      achievements: []
    };
  }

  /**
   * Calculate appropriate tier based on performance
   */
  private calculateTier(approvalRate: number, totalTrends: number): SpotterTier {
    if (approvalRate >= 0.8 && totalTrends >= 50) return 'elite';
    if (approvalRate >= 0.5 && totalTrends >= 20) return 'verified';
    if (approvalRate >= 0.3 || totalTrends < 10) return 'learning';
    return 'restricted';
  }

  /**
   * Calculate next tier requirements
   */
  private calculateNextTierThreshold(
    currentTier: SpotterTier,
    currentApprovalRate: number,
    totalTrends: number
  ): SpotterPerformanceMetrics['nextTierThreshold'] {
    const thresholds = {
      restricted: { tier: 'learning' as SpotterTier, approvalRate: 0.3, minTrends: 10 },
      learning: { tier: 'verified' as SpotterTier, approvalRate: 0.5, minTrends: 20 },
      verified: { tier: 'elite' as SpotterTier, approvalRate: 0.8, minTrends: 50 },
      elite: null
    };

    const nextTier = thresholds[currentTier];
    if (!nextTier) return undefined;

    return {
      tier: nextTier.tier,
      requiredApprovalRate: nextTier.approvalRate,
      currentApprovalRate: currentApprovalRate,
      trendsNeeded: Math.max(0, nextTier.minTrends - totalTrends)
    };
  }

  /**
   * Get category expertise for a user
   */
  async getCategoryExpertise(userId: string): Promise<CategoryExpertise[]> {
    try {
      const { data, error } = await supabase
        .from('spotter_category_expertise')
        .select('*')
        .eq('user_id', userId)
        .order('trends_submitted', { ascending: false });
      
      if (error) {
        console.warn('Category expertise table not available:', error);
        return [];
      }

      return (data || []).map(exp => ({
        category: exp.category,
        level: this.calculateExpertiseLevel(exp.trends_submitted, exp.approval_rate),
        trendsSubmitted: exp.trends_submitted,
        approvalRate: exp.approval_rate,
        bonusMultiplier: this.calculateCategoryBonus(exp.level)
      }));
    } catch (error) {
      console.error('Error fetching category expertise:', error);
      return [];
    }
  }

  /**
   * Calculate expertise level based on performance
   */
  private calculateExpertiseLevel(
    trendsSubmitted: number, 
    approvalRate: number
  ): CategoryExpertise['level'] {
    if (trendsSubmitted >= 100 && approvalRate >= 0.9) return 'master';
    if (trendsSubmitted >= 50 && approvalRate >= 0.8) return 'expert';
    if (trendsSubmitted >= 20 && approvalRate >= 0.6) return 'intermediate';
    return 'novice';
  }

  /**
   * Calculate category expertise bonus
   */
  private calculateCategoryBonus(level: string): number {
    const bonuses = {
      master: 0.3,
      expert: 0.2,
      intermediate: 0.1,
      novice: 0
    };
    return bonuses[level as keyof typeof bonuses] || 0;
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    // This would be fetched from a database in production
    const achievements: Achievement[] = [
      {
        id: 'first_approved',
        name: 'First Steps',
        description: 'Get your first trend approved',
        reward: { type: 'bonus', value: 0.5 }
      },
      {
        id: 'streak_10',
        name: 'On Fire',
        description: '10 approved trends in a row',
        reward: { type: 'multiplier', value: 0.1 }
      },
      {
        id: 'viral_trend',
        name: 'Viral Hunter',
        description: 'Submit a trend that goes viral',
        reward: { type: 'badge', value: '🦠' }
      },
      {
        id: 'category_expert',
        name: 'Category Expert',
        description: 'Reach expert level in any category',
        reward: { type: 'multiplier', value: 0.2 }
      }
    ];

    // Check which achievements are unlocked
    // This is placeholder logic - would be more complex in production
    return achievements;
  }

  /**
   * Get daily challenge for user
   */
  async getDailyChallenge(userId: string): Promise<DailyChallenge | undefined> {
    // This would be personalized per user in production
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      id: `daily_${today.toISOString().split('T')[0]}`,
      description: 'Submit 3 Tech & Gaming trends',
      progress: 0, // Would track actual progress
      target: 3,
      reward: 0.5,
      expiresAt: tomorrow.toISOString()
    };
  }

  /**
   * Calculate dynamic payment for a trend submission
   */
  async calculateTrendPayment(
    userId: string,
    trendData: any,
    qualityMetrics: TrendQualityMetrics
  ): Promise<{
    baseAmount: number;
    qualityBonus: number;
    tierMultiplier: number;
    categoryBonus: number;
    earlyDetectionBonus: number;
    streakBonus: number;
    totalAmount: number;
    breakdown: string[];
  }> {
    const metrics = await this.getSpotterPerformanceMetrics(userId);
    if (!metrics) {
      return {
        baseAmount: 0.08,
        qualityBonus: 0,
        tierMultiplier: 1,
        categoryBonus: 0,
        earlyDetectionBonus: 0,
        streakBonus: 0,
        totalAmount: 0.08,
        breakdown: ['Base payment: $0.08']
      };
    }

    const benefits = this.getTierBenefits(metrics.currentTier);
    
    // Base amount based on quality
    const baseAmount = benefits.basePaymentRange.min + 
      (benefits.basePaymentRange.max - benefits.basePaymentRange.min) * qualityMetrics.overallQuality;

    // Quality bonus (up to 50% extra for high quality)
    const qualityBonus = benefits.qualityBonusEnabled ? 
      baseAmount * qualityMetrics.overallQuality * 0.5 : 0;

    // Category expertise bonus
    const categoryExpert = metrics.categoryExpertise.find(
      exp => exp.category === trendData.category
    );
    const categoryBonus = categoryExpert ? 
      baseAmount * categoryExpert.bonusMultiplier : 0;

    // Early detection bonus (placeholder - would check trend age)
    const isEarlyDetection = false; // Would check if trend is < 24 hours old
    const earlyDetectionBonus = isEarlyDetection ? 
      baseAmount * benefits.earlyDetectionBonusRate : 0;

    // Streak bonus
    const streakMultiplier = Math.min(metrics.consecutiveApprovedTrends * 0.02, 0.4);
    const streakBonus = baseAmount * streakMultiplier;

    // Calculate total with tier multiplier
    const subtotal = baseAmount + qualityBonus + categoryBonus + 
      earlyDetectionBonus + streakBonus;
    const totalAmount = subtotal * benefits.paymentMultiplier;

    // Build breakdown
    const breakdown = [
      `Base payment: $${baseAmount.toFixed(3)}`,
      `Tier multiplier (${metrics.currentTier}): ${benefits.paymentMultiplier}x`
    ];

    if (qualityBonus > 0) {
      breakdown.push(`Quality bonus: +$${qualityBonus.toFixed(3)}`);
    }
    if (categoryBonus > 0) {
      breakdown.push(`Category expertise: +$${categoryBonus.toFixed(3)}`);
    }
    if (earlyDetectionBonus > 0) {
      breakdown.push(`Early detection: +$${earlyDetectionBonus.toFixed(3)}`);
    }
    if (streakBonus > 0) {
      breakdown.push(`Streak bonus (${metrics.consecutiveApprovedTrends}): +$${streakBonus.toFixed(3)}`);
    }

    return {
      baseAmount,
      qualityBonus,
      tierMultiplier: benefits.paymentMultiplier,
      categoryBonus,
      earlyDetectionBonus,
      streakBonus,
      totalAmount,
      breakdown
    };
  }

  /**
   * Update user metrics after trend submission
   */
  async updateSpotterMetrics(
    userId: string,
    trendId: string,
    qualityScore: number
  ): Promise<void> {
    try {
      // Update quality score (moving average)
      await supabase.rpc('update_spotter_quality_score', {
        p_user_id: userId,
        p_new_quality_score: qualityScore
      });

      // Update consecutive trends will be handled by database triggers
      // when the trend gets approved/rejected
    } catch (error) {
      console.error('Error updating spotter metrics:', error);
    }
  }

  /**
   * Format tier display
   */
  formatTierDisplay(tier: SpotterTier): {
    badge: string;
    name: string;
    color: string;
    description: string;
  } {
    const displays = {
      elite: {
        badge: '🏆',
        name: 'Elite Spotter',
        color: 'text-yellow-400',
        description: '1.5x payments • Premium access • All bonuses'
      },
      verified: {
        badge: '✅',
        name: 'Verified Spotter',
        color: 'text-green-400',
        description: 'Standard payments • Full access • Quality bonuses'
      },
      learning: {
        badge: '📚',
        name: 'Learning Spotter',
        color: 'text-blue-400',
        description: '0.7x payments • Building reputation • Keep improving!'
      },
      restricted: {
        badge: '⚠️',
        name: 'Restricted',
        color: 'text-orange-400',
        description: '0.3x payments • Limited access • Quality improvement needed'
      }
    };

    return displays[tier];
  }
}