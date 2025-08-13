/**
 * REVISED EARNINGS CONFIGURATION
 * Much more aggressive multipliers for gig economy
 */

export const REVISED_EARNINGS = {
  // Base earnings (unchanged)
  base: {
    trendSubmission: 1.00,
    validationVote: 0.10,
    approvalBonus: 0.50,
  },

  // Quality bonuses (increased)
  qualityBonuses: {
    screenshotIncluded: 0.20,
    completeInfo: 0.30, // title + good description
    demographicsData: 0.20,
    multiplePlatforms: 0.15,
    creatorInfo: 0.15,
    richHashtags: 0.15,
    captionProvided: 0.10,
  },

  // Performance bonuses (MASSIVELY increased)
  performanceBonuses: {
    highViews: { threshold: 100000, bonus: 0.50 },
    viralContent: { threshold: 1000000, bonus: 2.00 },
    megaViral: { threshold: 10000000, bonus: 5.00 },
    highEngagement: { threshold: 0.10, bonus: 0.50 },
    trendingNow: { withinHours: 24, bonus: 1.00 },
    highWaveScore: { threshold: 70, bonus: 0.50 },
  },

  // Speed bonuses (reward being first)
  speedBonuses: {
    firstSpotter: 5.00, // First to spot a viral trend
    earlySpotter: 2.00, // In first 10 to spot
    quickSubmit: 0.50,  // Within 1 hour of original post
  },

  // Category multipliers (some trends worth way more)
  categoryMultipliers: {
    finance: 2.0,
    crypto: 2.5,
    stocks: 2.0,
    nft: 2.0,
    ai: 1.5,
    politics: 1.5,
    breaking_news: 3.0,
    entertainment: 1.0,
    humor: 1.0,
    fashion: 1.0,
    other: 1.0,
  },

  // REVISED Tier multipliers (MUCH more aggressive)
  tierMultipliers: {
    master: 5.0,    // Top 1% - earn 5x
    elite: 3.0,     // Top 10% - earn 3x
    verified: 2.0,  // Proven users - earn 2x
    learning: 1.0,  // New users - base rate
    restricted: 0.25, // Low quality - severely reduced
  },

  // Tier requirements (more achievable)
  tierRequirements: {
    master: {
      minTrends: 100,
      minApprovalRate: 0.85,
      minQualityScore: 0.85,
      minViralTrends: 10,
      minTotalEarned: 1000,
    },
    elite: {
      minTrends: 25,
      minApprovalRate: 0.75,
      minQualityScore: 0.70,
      minViralTrends: 3,
    },
    verified: {
      minTrends: 5,
      minApprovalRate: 0.60,
      minQualityScore: 0.50,
    },
    learning: {
      minTrends: 0,
      minApprovalRate: 0,
      minQualityScore: 0,
    },
  },

  // Caps BY TIER (power users can earn much more)
  capsByTier: {
    master: {
      perSubmission: 50.00,
      daily: 1000.00,
    },
    elite: {
      perSubmission: 25.00,
      daily: 500.00,
    },
    verified: {
      perSubmission: 10.00,
      daily: 200.00,
    },
    learning: {
      perSubmission: 5.00,
      daily: 50.00,
    },
    restricted: {
      perSubmission: 2.00,
      daily: 10.00,
    },
  },

  // Streak bonuses
  streakBonuses: [
    { days: 3, bonus: 0.50 },
    { days: 7, bonus: 1.00 },
    { days: 14, bonus: 2.50 },
    { days: 30, bonus: 5.00 },
    { days: 60, bonus: 10.00 },
    { days: 90, bonus: 25.00 },
  ],

  // Referral program
  referralBonuses: {
    newUser: 5.00,        // When referral signs up
    activeUser: 10.00,    // When referral submits 10 trends
    powerUser: 25.00,     // When referral reaches verified
    eliteUser: 100.00,    // When referral reaches elite
  },

  // Achievement bonuses
  achievements: {
    first_trend: 1.00,
    tenth_trend: 5.00,
    hundredth_trend: 25.00,
    first_viral: 10.00,
    trending_master: 50.00, // 10 viral trends
    category_expert: 20.00, // 50 trends in one category
    speed_demon: 15.00,     // 20 first-spotter bonuses
  },

  // Payment methods (unchanged)
  paymentMethods: [
    { id: 'venmo', name: 'Venmo', minAmount: 10, fee: 0 },
    { id: 'paypal', name: 'PayPal', minAmount: 10, fee: 0.30 },
    { id: 'bank_transfer', name: 'Bank Transfer', minAmount: 25, fee: 0 },
    { id: 'crypto', name: 'Cryptocurrency', minAmount: 50, fee: 2.00 },
  ],
};

/**
 * Calculate REVISED earnings with aggressive multipliers
 */
export function calculateRevisedEarnings(
  trend: any,
  userProfile: any
): {
  base: number;
  bonuses: number;
  multipliers: number;
  total: number;
  breakdown: string[];
  potential: number; // Show what they COULD earn
} {
  const breakdown: string[] = [];
  
  // Base amount
  let base = REVISED_EARNINGS.base.trendSubmission;
  breakdown.push(`Base: $${base.toFixed(2)}`);
  
  // Calculate all bonuses
  let bonuses = 0;
  
  // Quality bonuses
  if (trend.screenshot_url) {
    bonuses += REVISED_EARNINGS.qualityBonuses.screenshotIncluded;
    breakdown.push(`Screenshot: +$${REVISED_EARNINGS.qualityBonuses.screenshotIncluded.toFixed(2)}`);
  }
  
  if (trend.title && trend.description?.length > 50) {
    bonuses += REVISED_EARNINGS.qualityBonuses.completeInfo;
    breakdown.push(`Quality content: +$${REVISED_EARNINGS.qualityBonuses.completeInfo.toFixed(2)}`);
  }
  
  // Performance bonuses
  const viewCount = trend.metadata?.view_count || 0;
  if (viewCount >= 10000000) {
    bonuses += REVISED_EARNINGS.performanceBonuses.megaViral.bonus;
    breakdown.push(`🔥 MEGA VIRAL: +$${REVISED_EARNINGS.performanceBonuses.megaViral.bonus.toFixed(2)}`);
  } else if (viewCount >= 1000000) {
    bonuses += REVISED_EARNINGS.performanceBonuses.viralContent.bonus;
    breakdown.push(`🚀 VIRAL: +$${REVISED_EARNINGS.performanceBonuses.viralContent.bonus.toFixed(2)}`);
  } else if (viewCount >= 100000) {
    bonuses += REVISED_EARNINGS.performanceBonuses.highViews.bonus;
    breakdown.push(`High views: +$${REVISED_EARNINGS.performanceBonuses.highViews.bonus.toFixed(2)}`);
  }
  
  // Get multipliers
  const tierMultiplier = REVISED_EARNINGS.tierMultipliers[userProfile.performance_tier] || 1.0;
  const categoryMultiplier = REVISED_EARNINGS.categoryMultipliers[trend.category] || 1.0;
  const totalMultiplier = tierMultiplier * categoryMultiplier;
  
  if (tierMultiplier > 1) {
    breakdown.push(`${userProfile.performance_tier.toUpperCase()} TIER: ${tierMultiplier}x`);
  }
  
  if (categoryMultiplier > 1) {
    breakdown.push(`${trend.category.toUpperCase()} CATEGORY: ${categoryMultiplier}x`);
  }
  
  // Calculate subtotal before cap
  const subtotal = (base + bonuses) * totalMultiplier;
  
  // Apply tier-based cap
  const tierCaps = REVISED_EARNINGS.capsByTier[userProfile.performance_tier] || REVISED_EARNINGS.capsByTier.learning;
  const cappedTotal = Math.min(subtotal, tierCaps.perSubmission);
  
  if (subtotal > cappedTotal) {
    breakdown.push(`Capped at tier max: $${cappedTotal.toFixed(2)}`);
  }
  
  // Calculate potential earnings at higher tiers
  const potentialAtElite = Math.min(
    (base + bonuses) * REVISED_EARNINGS.tierMultipliers.elite * categoryMultiplier,
    REVISED_EARNINGS.capsByTier.elite.perSubmission
  );
  
  const potentialAtMaster = Math.min(
    (base + bonuses) * REVISED_EARNINGS.tierMultipliers.master * categoryMultiplier,
    REVISED_EARNINGS.capsByTier.master.perSubmission
  );
  
  return {
    base,
    bonuses,
    multipliers: totalMultiplier,
    total: cappedTotal,
    breakdown,
    potential: Math.max(potentialAtElite, potentialAtMaster),
  };
}

/**
 * Show earnings potential by tier
 */
export function getEarningsPotential(category: string = 'entertainment') {
  const categoryMultiplier = REVISED_EARNINGS.categoryMultipliers[category] || 1.0;
  
  return {
    learning: {
      basic: 1.00 * categoryMultiplier,
      quality: 2.00 * categoryMultiplier,
      viral: Math.min(4.00 * categoryMultiplier, 5.00),
      megaViral: 5.00, // capped
      daily: 50.00,
    },
    verified: {
      basic: 2.00 * categoryMultiplier,
      quality: 4.00 * categoryMultiplier,
      viral: Math.min(8.00 * categoryMultiplier, 10.00),
      megaViral: 10.00, // capped
      daily: 200.00,
    },
    elite: {
      basic: 3.00 * categoryMultiplier,
      quality: 6.00 * categoryMultiplier,
      viral: Math.min(12.00 * categoryMultiplier, 25.00),
      megaViral: 25.00, // capped
      daily: 500.00,
    },
    master: {
      basic: 5.00 * categoryMultiplier,
      quality: 10.00 * categoryMultiplier,
      viral: Math.min(20.00 * categoryMultiplier, 50.00),
      megaViral: 50.00, // capped
      daily: 1000.00,
    },
  };
}

/**
 * Calculate how much a user could earn per month
 */
export function calculateMonthlyPotential(
  tier: string,
  trendsPerDay: number,
  viralRate: number = 0.05 // 5% go viral
) {
  const tierCaps = REVISED_EARNINGS.capsByTier[tier];
  const multiplier = REVISED_EARNINGS.tierMultipliers[tier];
  
  // Average earnings per trend at this tier
  const avgEarningsPerTrend = tier === 'master' ? 8.00 :
                              tier === 'elite' ? 5.00 :
                              tier === 'verified' ? 3.00 :
                              tier === 'learning' ? 1.50 : 0.50;
  
  const regularTrends = trendsPerDay * (1 - viralRate) * 30;
  const viralTrends = trendsPerDay * viralRate * 30;
  
  const regularEarnings = regularTrends * avgEarningsPerTrend;
  const viralEarnings = viralTrends * avgEarningsPerTrend * 3; // viral worth 3x
  
  const totalBeforeCap = regularEarnings + viralEarnings;
  const cappedTotal = Math.min(totalBeforeCap, tierCaps.daily * 30);
  
  return {
    regularEarnings,
    viralEarnings,
    totalBeforeCap,
    monthlyEarnings: cappedTotal,
    effectiveHourlyRate: cappedTotal / (trendsPerDay * 0.5 * 30), // Assume 30 min per trend
  };
}

/**
 * Motivational messages based on tier
 */
export function getTierMotivation(tier: string) {
  switch (tier) {
    case 'learning':
      return {
        message: "You're just getting started! Reach Verified tier to 2X your earnings!",
        nextGoal: "Submit 5 quality trends with 60% approval to unlock 2X multiplier",
        potentialIncrease: "100% earnings boost available",
      };
    case 'verified':
      return {
        message: "Great work! You're earning 2X! Push for Elite to earn 3X!",
        nextGoal: "25 trends with 75% approval + 3 viral hits for Elite status",
        potentialIncrease: "50% more earnings at Elite tier",
      };
    case 'elite':
      return {
        message: "You're in the top 10%! Earning 3X! Master tier pays 5X!",
        nextGoal: "100 trends, 85% approval, 10 viral hits for Master status",
        potentialIncrease: "67% more earnings at Master tier",
      };
    case 'master':
      return {
        message: "🏆 YOU'RE A MASTER! Earning 5X with $50 cap per trend!",
        nextGoal: "Maintain your exceptional performance",
        potentialIncrease: "You're at maximum earning potential!",
      };
    default:
      return {
        message: "Start submitting trends to begin earning!",
        nextGoal: "Submit your first trend",
        potentialIncrease: "Unlimited earning potential",
      };
  }
}

export default REVISED_EARNINGS;