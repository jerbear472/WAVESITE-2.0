/**
 * FINAL UNIFIED EARNINGS CONFIGURATION
 * This is the ONLY earnings file that should be imported
 * All other earnings files should be deleted
 */

// THE ONLY EARNINGS CONFIGURATION
export const EARNINGS = {
  // Base rates (matching database exactly)
  base: {
    trend: 0.25,
    validation: 0.02,
    approval: 0.10,
  },

  // Bonuses (matching database exactly)
  bonuses: {
    screenshot: 0.05,
    completeData: 0.05,
    highQuality: 0.05,
    trending: 0.25,
    firstSpotter: 0.50,
    financeCategory: 0.10,
  },

  // Tier multipliers (matching database exactly)
  tiers: {
    master: { multiplier: 3.0, dailyCap: 30.00, trendCap: 2.25 },
    elite: { multiplier: 2.0, dailyCap: 20.00, trendCap: 1.50 },
    verified: { multiplier: 1.5, dailyCap: 15.00, trendCap: 1.13 },
    learning: { multiplier: 1.0, dailyCap: 10.00, trendCap: 0.75 },
    restricted: { multiplier: 0.5, dailyCap: 5.00, trendCap: 0.50 },
  },

  // Tier requirements
  requirements: {
    master: { trends: 100, approvalRate: 0.80, qualityScore: 0.80 },
    elite: { trends: 50, approvalRate: 0.70, qualityScore: 0.70 },
    verified: { trends: 10, approvalRate: 0.60, qualityScore: 0.60 },
  },

  // Payment methods
  payment: {
    methods: [
      { id: 'venmo', name: 'Venmo', min: 10, fee: 0 },
      { id: 'paypal', name: 'PayPal', min: 10, fee: 0.30 },
      { id: 'bank', name: 'Bank Transfer', min: 25, fee: 0 },
      { id: 'crypto', name: 'Crypto', min: 50, fee: 2.00 },
    ],
  },
};

// Type definitions
export type Tier = keyof typeof EARNINGS.tiers;
export type PaymentMethod = 'venmo' | 'paypal' | 'bank' | 'crypto';

export interface TrendData {
  screenshot_url?: string;
  title?: string;
  description?: string;
  quality_score?: number;
  category?: string;
  metadata?: {
    view_count?: number;
  };
}

export interface UserProfile {
  user_id: string;
  performance_tier: Tier;
  current_balance: number;
  total_earned: number;
  today_earned?: number;
}

/**
 * Calculate earnings for a trend (client-side preview)
 * Actual calculation happens in database
 */
export function previewTrendEarnings(
  trend: TrendData,
  userTier: Tier = 'learning'
): {
  base: number;
  bonuses: number;
  multiplier: number;
  total: number;
  capped: number;
} {
  const tierConfig = EARNINGS.tiers[userTier];
  
  // Base
  let base = EARNINGS.base.trend;
  
  // Calculate bonuses
  let bonuses = 0;
  if (trend.screenshot_url) bonuses += EARNINGS.bonuses.screenshot;
  if (trend.title && trend.description && trend.description.length > 30) {
    bonuses += EARNINGS.bonuses.completeData;
  }
  if (trend.quality_score && trend.quality_score > 80) {
    bonuses += EARNINGS.bonuses.highQuality;
  }
  if (trend.metadata?.view_count && trend.metadata.view_count > 100000) {
    bonuses += EARNINGS.bonuses.trending;
  }
  if (trend.category && ['finance', 'crypto', 'stocks'].includes(trend.category)) {
    bonuses += EARNINGS.bonuses.financeCategory;
  }
  
  // Apply multiplier
  const total = (base + bonuses) * tierConfig.multiplier;
  
  // Apply cap
  const capped = Math.min(total, tierConfig.trendCap);
  
  return {
    base,
    bonuses,
    multiplier: tierConfig.multiplier,
    total,
    capped,
  };
}

/**
 * Format currency consistently
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get tier display info
 */
export function getTierInfo(tier: Tier) {
  const config = EARNINGS.tiers[tier];
  const requirements = EARNINGS.requirements[tier as keyof typeof EARNINGS.requirements];
  
  return {
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    multiplier: config.multiplier,
    dailyCap: config.dailyCap,
    trendCap: config.trendCap,
    color: getTierColor(tier),
    emoji: getTierEmoji(tier),
    requirements,
  };
}

/**
 * Get tier color
 */
export function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'master': return '#FFD700'; // Gold
    case 'elite': return '#8B4513'; // Bronze
    case 'verified': return '#C0C0C0'; // Silver
    case 'learning': return '#4CAF50'; // Green
    case 'restricted': return '#F44336'; // Red
    default: return '#9E9E9E';
  }
}

/**
 * Get tier emoji
 */
export function getTierEmoji(tier: Tier): string {
  switch (tier) {
    case 'master': return '👑';
    case 'elite': return '⭐';
    case 'verified': return '✅';
    case 'learning': return '📚';
    case 'restricted': return '⚠️';
    default: return '👤';
  }
}

/**
 * Calculate monthly earning potential
 */
export function getMonthlyPotential(tier: Tier): {
  minimum: number; // Working 5 days/week, minimal effort
  average: number; // Active user
  maximum: number; // Daily cap every day
} {
  const config = EARNINGS.tiers[tier];
  
  return {
    minimum: config.dailyCap * 0.25 * 20, // 25% of cap, 20 days
    average: config.dailyCap * 0.50 * 25, // 50% of cap, 25 days
    maximum: config.dailyCap * 30, // Full cap, 30 days
  };
}

/**
 * Get progress to next tier
 */
export function getTierProgress(
  currentTier: Tier,
  stats: {
    trends_submitted: number;
    approval_rate: number;
    quality_score: number;
  }
): {
  nextTier: Tier | null;
  progress: number;
  requirements: string[];
} {
  const tierOrder: Tier[] = ['learning', 'verified', 'elite', 'master'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return { nextTier: null, progress: 100, requirements: [] };
  }
  
  const nextTier = tierOrder[currentIndex + 1];
  const reqs = EARNINGS.requirements[nextTier as keyof typeof EARNINGS.requirements];
  
  if (!reqs) {
    return { nextTier: null, progress: 100, requirements: [] };
  }
  
  const progress = (
    (Math.min(stats.trends_submitted / reqs.trends, 1) * 33) +
    (Math.min(stats.approval_rate / reqs.approvalRate, 1) * 33) +
    (Math.min(stats.quality_score / reqs.qualityScore, 1) * 34)
  );
  
  const requirements: string[] = [];
  if (stats.trends_submitted < reqs.trends) {
    requirements.push(`Submit ${reqs.trends - stats.trends_submitted} more trends`);
  }
  if (stats.approval_rate < reqs.approvalRate) {
    requirements.push(`Reach ${(reqs.approvalRate * 100).toFixed(0)}% approval rate`);
  }
  if (stats.quality_score < reqs.qualityScore) {
    requirements.push(`Reach ${(reqs.qualityScore * 100).toFixed(0)}% quality score`);
  }
  
  return {
    nextTier,
    progress: Math.round(progress),
    requirements,
  };
}

// Export as default for clean imports
export default EARNINGS;