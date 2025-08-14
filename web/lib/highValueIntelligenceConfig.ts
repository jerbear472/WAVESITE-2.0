/**
 * HIGH-VALUE INTELLIGENCE CONFIGURATION
 * 
 * This configuration is designed to capture the most valuable data points
 * for our four key client segments:
 * 1. Political Action Campaigns (PACs)
 * 2. Marketing Firms & Brands
 * 3. Hedge Funds & Financial Institutions
 * 4. Content Creators & Influencers
 */

export interface HighValueIntelligenceData {
  // Core trend identification
  trendId: string;
  capturedAt: string;
  spotterId: string;
  
  // CRITICAL VALUE METRICS
  monetizationWindow: {
    stage: 'pre_viral' | 'ascending' | 'peak' | 'declining' | 'dead';
    daysUntilPeak: number | null;
    exploitabilityScore: number; // 0-100
    firstMoverAdvantage: boolean;
  };
  
  // AUDIENCE PSYCHOGRAPHICS (Not just demographics)
  audiencePsychology: {
    emotionalTriggers: ('fear' | 'anger' | 'joy' | 'disgust' | 'surprise' | 'anticipation' | 'trust' | 'sadness')[];
    motivationalDrivers: ('status' | 'belonging' | 'achievement' | 'power' | 'security' | 'tradition' | 'stimulation' | 'self_direction')[];
    purchaseReadiness: 'immediate' | 'researching' | 'awareness' | 'unaware';
    influenceability: 'highly_suggestible' | 'moderate' | 'skeptical' | 'contrarian';
    tribalAffiliation: string[]; // Specific communities they identify with
  };
  
  // COMPETITIVE INTELLIGENCE
  marketIntelligence: {
    brandsAlreadyCapitalizing: string[];
    estimatedRevenueOpportunity: 'under_10k' | '10k_100k' | '100k_1m' | '1m_10m' | 'over_10m';
    whiteSpaceOpportunities: string[]; // Unexploited angles
    competitorBlindSpots: string[]; // What competitors are missing
    optimalEntryStrategy: 'first_mover' | 'fast_follower' | 'contrarian' | 'wait';
  };
  
  // MANIPULATION & AMPLIFICATION VECTORS
  viralMechanics: {
    shareabilityTrigger: 'controversy' | 'humor' | 'outrage' | 'inspiration' | 'fear' | 'exclusive_knowledge';
    algorithmExploits: ('engagement_bait' | 'reply_guy_magnet' | 'quote_tweet_fodder' | 'stitch_bait' | 'duet_magnet')[];
    optimalPostTime: string; // ISO timestamp
    hashtagStrategy: {
      primary: string[];
      secondary: string[];
      avoid: string[]; // Hashtags that would hurt reach
    };
  };
  
  // CATEGORY-SPECIFIC HIGH-VALUE INTELLIGENCE
  categoryIntelligence: PoliticalIntel | FinanceIntel | BrandIntel | CreatorIntel;
}

// POLITICAL ACTION CAMPAIGN INTELLIGENCE
export interface PoliticalIntel {
  type: 'political';
  
  // Voter influence metrics
  voterImpact: {
    swingVoterReach: 'none' | 'minimal' | 'moderate' | 'significant' | 'massive';
    demographicPenetration: {
      age_18_29: number; // percentage
      age_30_44: number;
      age_45_64: number;
      age_65_plus: number;
    };
    geoConcentration: {
      swingStates: string[];
      urbanRural: 'urban' | 'suburban' | 'rural' | 'mixed';
      concentrationScore: number; // 0-100
    };
  };
  
  // Message testing data
  narrativeIntelligence: {
    dominantFraming: string; // How the issue is being framed
    counterNarratives: string[]; // Opposing framings gaining traction
    emotionalValence: 'positive' | 'negative' | 'mixed';
    policyImplications: string[];
    astroturfingSignals: boolean; // Coordinated inauthentic behavior detected
  };
  
  // Opposition research
  oppositionVectors: {
    vulnerableMessengers: string[]; // Influencers who could be flipped
    attackSurfaces: string[]; // Weaknesses in the narrative
    prebunking0pportunities: string[]; // Get ahead of opposing narratives
  };
  
  // Donor intelligence
  donorSignals: {
    alignsWithDonorPriorities: string[]; // Which major donors care
    grassrootsMonetization: 'high' | 'medium' | 'low';
    corporateInterest: string[]; // Which companies are watching
  };
}

// HEDGE FUND & FINANCIAL INTELLIGENCE
export interface FinanceIntel {
  type: 'finance';
  
  // Market movement predictors
  marketSignals: {
    tickerSymbols: string[]; // Affected stocks
    sectorImpact: ('tech' | 'retail' | 'finance' | 'healthcare' | 'energy' | 'consumer_goods')[];
    sentimentDirection: 'bullish' | 'bearish' | 'neutral';
    volumeIndicator: 'accumulation' | 'distribution' | 'neutral';
    institutionalActivity: 'none_detected' | 'accumulating' | 'distributing';
  };
  
  // Retail investor behavior
  retailBehavior: {
    fomoProbability: number; // 0-100
    paperHandsRatio: number; // Likelihood of panic selling
    diamondHandsPresence: boolean; // HODLers detected
    coordinationLevel: 'none' | 'loose' | 'organized' | 'weaponized';
    influencerPumping: string[]; // Specific influencers pushing
  };
  
  // Regulatory & compliance risks
  regulatoryRadar: {
    secAttentionRisk: 'none' | 'low' | 'medium' | 'high' | 'imminent';
    classActionPotential: boolean;
    politicalScrutiny: 'none' | 'building' | 'active';
    complianceFlags: string[];
  };
  
  // Alpha generation opportunities
  alphaVectors: {
    informationAsymmetry: string; // What the market doesn't know yet
    catalystTiming: string; // When the move will happen
    exitStrategy: string; // When to get out
    hedgeRecommendation: string; // How to protect downside
  };
}

// BRAND & MARKETING INTELLIGENCE
export interface BrandIntel {
  type: 'brand';
  
  // Purchase intent signals
  purchaseIntelligence: {
    buyingStage: 'unaware' | 'aware' | 'considering' | 'intent' | 'purchasing';
    priceExpectation: 'budget' | 'value' | 'premium' | 'luxury';
    decisionTimeframe: 'immediate' | 'this_week' | 'this_month' | 'this_quarter' | 'exploring';
    competitorMentions: { [brand: string]: 'positive' | 'negative' | 'neutral' };
  };
  
  // Creative intelligence
  creativeInsights: {
    winningFormats: ('video' | 'image' | 'text' | 'audio' | 'ar_filter' | 'interactive')[];
    messagingThatWorks: string[]; // Specific phrases/angles
    visualStyle: string; // Aesthetic that's resonating
    soundtrackMeta: string; // Audio trends to leverage
    ugcPotential: 'none' | 'low' | 'medium' | 'high' | 'viral';
  };
  
  // Influencer intelligence
  influencerMap: {
    keyAmplifiers: {
      handle: string;
      followerCount: number;
      engagementRate: number;
      commercialViability: 'brand_safe' | 'edgy' | 'controversial' | 'toxic';
      estimatedRate: string; // Price range for sponsorship
      contactMethod: string; // How to reach them
    }[];
    microInfluencers: string[]; // Smaller but highly engaged
    brandAmbassadorCandidates: string[]; // Potential long-term partners
  };
  
  // Crisis & reputation intelligence
  brandRiskIntelligence: {
    negativeSentimentDrivers: string[];
    cancelRisk: 'none' | 'low' | 'moderate' | 'high' | 'active';
    opportunityForCompetitors: string[]; // How competitors could exploit
    defensiveStrategy: string; // How to protect brand
  };
}

// CREATOR & INFLUENCER INTELLIGENCE
export interface CreatorIntel {
  type: 'creator';
  
  // Content opportunity scoring
  contentOpportunity: {
    formatViability: {
      shortForm: number; // 0-100
      longForm: number;
      livestream: number;
      series: number;
    };
    optimalDuration: string; // Specific duration that performs best
    collaborationPotential: string[]; // Creators to collaborate with
    crossPlatformStrategy: { [platform: string]: string }; // Platform-specific angles
  };
  
  // Monetization intelligence
  monetizationVectors: {
    sponsorshipViability: 'immediate' | 'soon' | 'later' | 'unlikely';
    interestedBrands: string[]; // Brands monitoring this trend
    affiliateOpportunity: { product: string; commission: string }[];
    courseCreationPotential: boolean;
    merchandiseAngle: string;
  };
  
  // Algorithm optimization
  algorithmIntelligence: {
    platformPriority: ('tiktok' | 'instagram' | 'youtube' | 'twitter')[];
    triggerKeywords: string[]; // Words that boost reach
    avoidKeywords: string[]; // Words that limit reach
    optimalPostFrequency: string; // How often to post about this
    seriesStrategy: boolean; // Should this be a series?
  };
  
  // Audience growth vectors
  growthIntelligence: {
    followerConversionRate: number; // Expected follow rate
    nicheCommunities: string[]; // Specific communities to target
    gatekeepers: string[]; // Key accounts that could amplify
    viralityProbability: number; // 0-100
  };
}

// DYNAMIC QUESTION SETS BY CLIENT TYPE
export const HIGH_VALUE_QUESTIONS = {
  // Questions that help identify monetization windows
  timing: [
    {
      id: 'discovery_stage',
      question: 'How did you discover this trend?',
      options: [
        { value: 'friend_shared', label: 'Friend shared directly', score: 30 },
        { value: 'fyp_organic', label: 'Appeared on FYP/Feed', score: 50 },
        { value: 'searching', label: 'Found while searching', score: 20 },
        { value: 'creator_mention', label: 'Creator I follow posted', score: 70 },
        { value: 'news_coverage', label: 'Saw in news/media', score: 10 }
      ]
    },
    {
      id: 'exposure_count',
      question: 'How many times have you seen this trend today?',
      options: [
        { value: 'first_time', label: 'This is the first', score: 100 },
        { value: '2_5_times', label: '2-5 times', score: 70 },
        { value: '6_10_times', label: '6-10 times', score: 40 },
        { value: 'over_10', label: 'Over 10 times', score: 20 },
        { value: 'everywhere', label: "It's everywhere", score: 10 }
      ]
    }
  ],
  
  // Questions that reveal purchase intent
  commercial: [
    {
      id: 'purchase_influence',
      question: 'Has this trend influenced any purchase decisions?',
      options: [
        { value: 'already_bought', label: 'Already bought something', signal: 'HOT' },
        { value: 'researching', label: 'Researching products now', signal: 'WARM' },
        { value: 'considering', label: 'Considering buying', signal: 'LUKEWARM' },
        { value: 'just_browsing', label: 'Just browsing/curious', signal: 'COLD' },
        { value: 'would_never', label: 'Would never buy', signal: 'NEGATIVE' }
      ]
    },
    {
      id: 'spend_threshold',
      question: 'If you were to buy, how much would you spend?',
      options: [
        { value: 'under_25', label: 'Under $25' },
        { value: '25_100', label: '$25-100' },
        { value: '100_500', label: '$100-500' },
        { value: '500_2000', label: '$500-2000' },
        { value: 'over_2000', label: 'Over $2000' }
      ]
    }
  ],
  
  // Questions that reveal political influence
  political: [
    {
      id: 'opinion_change',
      question: 'Has this trend changed your opinion on anything?',
      options: [
        { value: 'completely_changed', label: 'Completely changed my view' },
        { value: 'somewhat_influenced', label: 'Made me reconsider' },
        { value: 'reinforced', label: 'Reinforced existing view' },
        { value: 'no_impact', label: 'No impact on opinions' },
        { value: 'opposite_effect', label: 'Had opposite effect' }
      ]
    },
    {
      id: 'action_likelihood',
      question: 'Will you take any action based on this trend?',
      options: [
        { value: 'share_friends', label: 'Share with friends/family' },
        { value: 'post_about', label: 'Create content about it' },
        { value: 'donate_cause', label: 'Donate to related cause' },
        { value: 'contact_representative', label: 'Contact representative' },
        { value: 'change_vote', label: 'Influences my vote' },
        { value: 'no_action', label: 'No action planned' }
      ]
    }
  ],
  
  // Questions that reveal market sentiment
  financial: [
    {
      id: 'market_interpretation',
      question: 'What does this trend signal about the market/economy?',
      options: [
        { value: 'bull_signal', label: 'Bullish indicator' },
        { value: 'bear_signal', label: 'Bearish indicator' },
        { value: 'sector_rotation', label: 'Sector rotation coming' },
        { value: 'bubble_forming', label: 'Bubble forming' },
        { value: 'crash_incoming', label: 'Crash warning' },
        { value: 'no_signal', label: 'No market relevance' }
      ]
    },
    {
      id: 'investment_action',
      question: 'Investment action you might take?',
      options: [
        { value: 'buy_immediately', label: 'Buy immediately' },
        { value: 'research_more', label: 'Research further' },
        { value: 'wait_dip', label: 'Wait for dip' },
        { value: 'short_sell', label: 'Consider shorting' },
        { value: 'stay_away', label: 'Avoid entirely' }
      ]
    }
  ]
};

// VALUE SCORING ALGORITHM
export function calculateIntelligenceValue(data: HighValueIntelligenceData): {
  totalValue: number;
  pacValue: number;
  hedgeFundValue: number;
  brandValue: number;
  creatorValue: number;
  reasoning: string[];
} {
  let pacValue = 0;
  let hedgeFundValue = 0;
  let brandValue = 0;
  let creatorValue = 0;
  const reasoning: string[] = [];
  
  // Calculate based on monetization window
  if (data.monetizationWindow.stage === 'pre_viral') {
    pacValue += 40;
    hedgeFundValue += 50;
    brandValue += 45;
    creatorValue += 50;
    reasoning.push('Pre-viral detection provides first-mover advantage');
  }
  
  // Calculate based on audience psychology
  if (data.audiencePsychology.purchaseReadiness === 'immediate') {
    brandValue += 35;
    reasoning.push('Immediate purchase intent detected');
  }
  
  if (data.audiencePsychology.influenceability === 'highly_suggestible') {
    pacValue += 30;
    brandValue += 25;
    reasoning.push('Highly influenceable audience identified');
  }
  
  // Category-specific value calculations
  if (data.categoryIntelligence.type === 'political') {
    const pol = data.categoryIntelligence as PoliticalIntel;
    if (pol.voterImpact.swingVoterReach === 'significant' || pol.voterImpact.swingVoterReach === 'massive') {
      pacValue += 45;
      reasoning.push('Significant swing voter reach potential');
    }
  }
  
  if (data.categoryIntelligence.type === 'finance') {
    const fin = data.categoryIntelligence as FinanceIntel;
    if (fin.marketSignals.institutionalActivity !== 'none_detected') {
      hedgeFundValue += 40;
      reasoning.push('Institutional activity detected');
    }
    if (fin.retailBehavior.fomoProbability > 70) {
      hedgeFundValue += 30;
      reasoning.push('High FOMO probability indicates volatility opportunity');
    }
  }
  
  if (data.categoryIntelligence.type === 'brand') {
    const brand = data.categoryIntelligence as BrandIntel;
    if (brand.purchaseIntelligence.buyingStage === 'intent' || brand.purchaseIntelligence.buyingStage === 'purchasing') {
      brandValue += 40;
      reasoning.push('High purchase intent stage');
    }
  }
  
  if (data.categoryIntelligence.type === 'creator') {
    const creator = data.categoryIntelligence as CreatorIntel;
    if (creator.monetizationVectors.sponsorshipViability === 'immediate') {
      creatorValue += 35;
      reasoning.push('Immediate sponsorship opportunity');
    }
    if (creator.growthIntelligence.viralityProbability > 70) {
      creatorValue += 30;
      reasoning.push('High virality probability');
    }
  }
  
  // Calculate total value (weighted average)
  const totalValue = Math.min(100, Math.round(
    (pacValue * 0.25) + 
    (hedgeFundValue * 0.25) + 
    (brandValue * 0.25) + 
    (creatorValue * 0.25)
  ));
  
  return {
    totalValue,
    pacValue: Math.min(100, pacValue),
    hedgeFundValue: Math.min(100, hedgeFundValue),
    brandValue: Math.min(100, brandValue),
    creatorValue: Math.min(100, creatorValue),
    reasoning
  };
}

// REAL-TIME VALUE INDICATORS
export const VALUE_INDICATORS = {
  critical: {
    color: '#FF0000',
    label: 'CRITICAL VALUE',
    threshold: 85,
    alert: 'This intelligence has exceptional value across multiple client segments'
  },
  high: {
    color: '#FFA500',
    label: 'HIGH VALUE',
    threshold: 70,
    alert: 'Strong commercial potential detected'
  },
  moderate: {
    color: '#FFFF00',
    label: 'MODERATE VALUE',
    threshold: 50,
    alert: 'Useful intelligence for specific clients'
  },
  low: {
    color: '#808080',
    label: 'LOW VALUE',
    threshold: 0,
    alert: 'Limited commercial application'
  }
};