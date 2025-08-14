/**
 * Enhanced Trend Intelligence System
 * Focused on extracting maximum value for key client segments
 */

import { TrendIntelligenceData } from './trendIntelligenceConfig';

// Extend existing TrendIntelligenceData with high-value fields
export interface EnhancedTrendIntelligence extends TrendIntelligenceData {
  // Timing Intelligence (Critical for all clients)
  timingIntelligence: {
    discoveryStage: 'never_seen' | 'just_emerging' | 'gaining_momentum' | 'everywhere' | 'declining';
    exposureFrequency: 'first_time' | '2_5_times' | '6_10_times' | 'over_10' | 'saturated';
    hoursFromStart: number | null; // Estimated hours since trend began
  };
  
  // Commercial Intelligence (For brands & creators)
  commercialIntelligence: {
    purchaseIntent: 'already_bought' | 'researching' | 'considering' | 'browsing' | 'not_interested';
    priceExpectation: 'under_25' | '25_100' | '100_500' | '500_2000' | 'over_2000';
    brandsInvolved: string[]; // Which brands are already active
  };
  
  // Political Intelligence (For PACs)
  politicalIntelligence?: {
    opinionImpact: 'changed_completely' | 'reconsidering' | 'reinforced' | 'no_impact' | 'opposite_effect';
    actionLikelihood: ('share' | 'create_content' | 'donate' | 'contact_rep' | 'vote' | 'none')[];
    demographicReach: ('gen_z' | 'millennials' | 'gen_x' | 'boomers' | 'swing_voters')[];
  };
  
  // Market Intelligence (For hedge funds)
  marketIntelligence?: {
    marketSignal: 'bullish' | 'bearish' | 'sector_rotation' | 'bubble' | 'crash_warning' | 'neutral';
    investmentAction: 'buy_now' | 'research' | 'wait_dip' | 'short' | 'avoid';
    tickersAffected: string[]; // Stock/crypto tickers mentioned
  };
  
  // Calculated value scores
  valueScores: {
    overall: number; // 0-100
    pac: number;
    hedgeFund: number;
    brand: number;
    creator: number;
  };
}

// Dynamic questions based on category and responses
export const ENHANCED_QUESTIONS = {
  // PHASE 1: Timing (Universal - highest value)
  timing: {
    discovery: {
      id: 'discovery_stage',
      label: 'When did you first see this trend?',
      required: true,
      options: [
        { value: 'never_seen', label: 'This is the first time', score: 100 },
        { value: 'just_emerging', label: 'Just starting to appear', score: 75 },
        { value: 'gaining_momentum', label: 'Seeing it more often', score: 50 },
        { value: 'everywhere', label: 'It\'s everywhere now', score: 25 },
        { value: 'declining', label: 'Starting to fade', score: 10 }
      ]
    },
    frequency: {
      id: 'exposure_frequency',
      label: 'How many times have you seen this today?',
      required: true,
      options: [
        { value: 'first_time', label: 'First time', score: 90 },
        { value: '2_5_times', label: '2-5 times', score: 60 },
        { value: '6_10_times', label: '6-10 times', score: 40 },
        { value: 'over_10', label: 'Over 10 times', score: 20 },
        { value: 'saturated', label: 'Lost count', score: 5 }
      ]
    }
  },
  
  // PHASE 2: Intent (Reveals monetization potential)
  intent: {
    purchase: {
      id: 'purchase_intent',
      label: 'Has this influenced any purchase decisions?',
      required: true,
      options: [
        { value: 'already_bought', label: 'Already purchased', signal: 'HOT' },
        { value: 'researching', label: 'Actively researching', signal: 'WARM' },
        { value: 'considering', label: 'Considering it', signal: 'LUKEWARM' },
        { value: 'browsing', label: 'Just browsing', signal: 'COLD' },
        { value: 'not_interested', label: 'Not interested', signal: 'NONE' }
      ]
    },
    price: {
      id: 'price_expectation',
      label: 'Expected price point?',
      showIf: (responses: any) => responses.purchase_intent !== 'not_interested',
      options: [
        { value: 'under_25', label: 'Under $25' },
        { value: '25_100', label: '$25-100' },
        { value: '100_500', label: '$100-500' },
        { value: '500_2000', label: '$500-2,000' },
        { value: 'over_2000', label: 'Over $2,000' }
      ]
    }
  },
  
  // PHASE 3: Category-specific high-value questions
  political: {
    opinion: {
      id: 'opinion_impact',
      label: 'Impact on your opinions?',
      showFor: ['political', 'social_cause'],
      options: [
        { value: 'changed_completely', label: 'Changed my mind', impact: 95 },
        { value: 'reconsidering', label: 'Making me reconsider', impact: 70 },
        { value: 'reinforced', label: 'Reinforced my views', impact: 50 },
        { value: 'no_impact', label: 'No impact', impact: 10 },
        { value: 'opposite_effect', label: 'Backfired', impact: 85 }
      ]
    },
    action: {
      id: 'action_likelihood',
      label: 'Actions you might take?',
      type: 'multiselect',
      showFor: ['political', 'social_cause'],
      options: [
        { value: 'share', label: 'Share with others' },
        { value: 'create_content', label: 'Create content' },
        { value: 'donate', label: 'Donate money' },
        { value: 'contact_rep', label: 'Contact representative' },
        { value: 'vote', label: 'Influences my vote' },
        { value: 'none', label: 'No action' }
      ]
    }
  },
  
  finance: {
    market: {
      id: 'market_signal',
      label: 'What does this signal for markets?',
      showFor: ['finance'],
      options: [
        { value: 'bullish', label: 'Bullish signal', alpha: 80 },
        { value: 'bearish', label: 'Bearish signal', alpha: 85 },
        { value: 'sector_rotation', label: 'Sector rotation', alpha: 90 },
        { value: 'bubble', label: 'Bubble forming', alpha: 95 },
        { value: 'crash_warning', label: 'Crash indicator', alpha: 100 },
        { value: 'neutral', label: 'No market impact', alpha: 0 }
      ]
    },
    tickers: {
      id: 'tickers_affected',
      label: 'Stocks/crypto mentioned or affected',
      type: 'text',
      showFor: ['finance'],
      placeholder: 'TSLA, BTC, GME...'
    }
  },
  
  brand: {
    competitors: {
      id: 'brands_involved',
      label: 'Brands you\'ve seen jumping on this',
      type: 'text',
      showFor: ['brand', 'fashion'],
      placeholder: 'Nike, Pepsi, etc...'
    },
    authenticity: {
      id: 'brand_authenticity',
      label: 'How authentic do brand attempts feel?',
      showFor: ['brand'],
      options: [
        { value: 'native', label: 'Totally natural', risk: 0 },
        { value: 'good_fit', label: 'Good fit', risk: 10 },
        { value: 'trying', label: 'Trying hard', risk: 40 },
        { value: 'forced', label: 'Forced', risk: 70 },
        { value: 'cringe', label: 'Cringe/Backfiring', risk: 100 }
      ]
    }
  },
  
  creator: {
    content: {
      id: 'content_angle',
      label: 'Best creator opportunity?',
      showFor: ['meme', 'music', 'gaming'],
      options: [
        { value: 'first', label: 'Be first to explain', opportunity: 95 },
        { value: 'contrarian', label: 'Contrarian take', opportunity: 80 },
        { value: 'deep_dive', label: 'Deep analysis', opportunity: 70 },
        { value: 'comedy', label: 'Comedy/parody', opportunity: 85 },
        { value: 'tutorial', label: 'How-to guide', opportunity: 75 }
      ]
    }
  }
};

// Calculate intelligence value score
export function calculateValueScore(
  data: Partial<EnhancedTrendIntelligence>,
  category: string
): EnhancedTrendIntelligence['valueScores'] {
  let overall = 0;
  let pac = 0;
  let hedgeFund = 0;
  let brand = 0;
  let creator = 0;
  
  // Timing value (universal)
  if (data.timingIntelligence) {
    const timingScore = data.timingIntelligence.discoveryStage === 'never_seen' ? 40 :
                       data.timingIntelligence.discoveryStage === 'just_emerging' ? 30 :
                       data.timingIntelligence.discoveryStage === 'gaining_momentum' ? 20 : 10;
    
    overall += timingScore;
    pac += timingScore;
    hedgeFund += timingScore * 1.2; // Hedge funds value early signals more
    brand += timingScore;
    creator += timingScore * 1.1; // Creators need to be early
  }
  
  // Commercial value
  if (data.commercialIntelligence) {
    const commercialScore = data.commercialIntelligence.purchaseIntent === 'already_bought' ? 35 :
                           data.commercialIntelligence.purchaseIntent === 'researching' ? 25 :
                           data.commercialIntelligence.purchaseIntent === 'considering' ? 15 : 5;
    
    brand += commercialScore * 1.5; // Brands care most about purchase intent
    creator += commercialScore;
    overall += commercialScore;
  }
  
  // Political value
  if (data.politicalIntelligence) {
    const politicalScore = data.politicalIntelligence.opinionImpact === 'changed_completely' ? 40 :
                          data.politicalIntelligence.opinionImpact === 'reconsidering' ? 30 : 15;
    
    pac += politicalScore * 2; // PACs value opinion changes highly
    overall += politicalScore * 0.5;
  }
  
  // Market value
  if (data.marketIntelligence) {
    const marketScore = data.marketIntelligence.marketSignal !== 'neutral' ? 35 : 5;
    
    hedgeFund += marketScore * 2; // Hedge funds value market signals most
    brand += marketScore * 0.5;
    overall += marketScore;
  }
  
  // Category bonuses
  const categoryBonus = {
    political: { pac: 20, hedgeFund: 5, brand: 5, creator: 10 },
    finance: { pac: 5, hedgeFund: 30, brand: 10, creator: 15 },
    brand: { pac: 5, hedgeFund: 10, brand: 30, creator: 20 },
    fashion: { pac: 0, hedgeFund: 5, brand: 25, creator: 25 },
    meme: { pac: 10, hedgeFund: 5, brand: 15, creator: 30 },
    gaming: { pac: 0, hedgeFund: 10, brand: 20, creator: 30 },
    music: { pac: 0, hedgeFund: 5, brand: 20, creator: 35 },
    social_cause: { pac: 25, hedgeFund: 5, brand: 15, creator: 15 },
    lifestyle: { pac: 5, hedgeFund: 5, brand: 25, creator: 25 },
    health: { pac: 10, hedgeFund: 15, brand: 20, creator: 20 }
  };
  
  const bonus = categoryBonus[category as keyof typeof categoryBonus] || 
                { pac: 5, hedgeFund: 5, brand: 5, creator: 5 };
  
  pac += bonus.pac;
  hedgeFund += bonus.hedgeFund;
  brand += bonus.brand;
  creator += bonus.creator;
  
  // Calculate overall as weighted average
  overall = Math.round((pac + hedgeFund + brand + creator) / 4);
  
  return {
    overall: Math.min(100, overall),
    pac: Math.min(100, pac),
    hedgeFund: Math.min(100, hedgeFund),
    brand: Math.min(100, brand),
    creator: Math.min(100, creator)
  };
}

// Get relevant questions for current phase
export function getQuestionsForPhase(
  phase: 'timing' | 'intent' | 'specific',
  category: string,
  responses: any
): any[] {
  const questions: any[] = [];
  
  if (phase === 'timing') {
    questions.push(ENHANCED_QUESTIONS.timing.discovery);
    questions.push(ENHANCED_QUESTIONS.timing.frequency);
  }
  
  if (phase === 'intent') {
    questions.push(ENHANCED_QUESTIONS.intent.purchase);
    
    // Show price question if they have purchase intent
    if (responses.purchase_intent && responses.purchase_intent !== 'not_interested') {
      questions.push(ENHANCED_QUESTIONS.intent.price);
    }
  }
  
  if (phase === 'specific') {
    // Add category-specific questions
    if (['political', 'social_cause'].includes(category)) {
      questions.push(ENHANCED_QUESTIONS.political.opinion);
      questions.push(ENHANCED_QUESTIONS.political.action);
    }
    
    if (category === 'finance') {
      questions.push(ENHANCED_QUESTIONS.finance.market);
      questions.push(ENHANCED_QUESTIONS.finance.tickers);
    }
    
    if (['brand', 'fashion'].includes(category)) {
      questions.push(ENHANCED_QUESTIONS.brand.competitors);
      if (category === 'brand') {
        questions.push(ENHANCED_QUESTIONS.brand.authenticity);
      }
    }
    
    if (['meme', 'music', 'gaming'].includes(category)) {
      questions.push(ENHANCED_QUESTIONS.creator.content);
    }
  }
  
  return questions.filter(q => q !== undefined);
}

// Value tier definitions
export const VALUE_TIERS = {
  critical: {
    threshold: 85,
    label: 'Critical Intelligence',
    color: '#FF4444',
    reward: '$100-500'
  },
  high: {
    threshold: 70,
    label: 'High Value',
    color: '#FFA500',
    reward: '$50-100'
  },
  moderate: {
    threshold: 50,
    label: 'Valuable',
    color: '#FFFF00',
    reward: '$20-50'
  },
  low: {
    threshold: 0,
    label: 'Standard',
    color: '#888888',
    reward: '$5-20'
  }
};

// Get value tier for score
export function getValueTier(score: number) {
  if (score >= VALUE_TIERS.critical.threshold) return VALUE_TIERS.critical;
  if (score >= VALUE_TIERS.high.threshold) return VALUE_TIERS.high;
  if (score >= VALUE_TIERS.moderate.threshold) return VALUE_TIERS.moderate;
  return VALUE_TIERS.low;
}