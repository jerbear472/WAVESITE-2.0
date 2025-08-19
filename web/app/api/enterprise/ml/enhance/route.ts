import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface TrendData {
  id: string;
  description: string;
  category: string;
  validation_count: number;
  validation_ratio: number;
  created_at: string;
  screenshot_url?: string;
  evidence?: any;
}

interface EnhancedTrend extends TrendData {
  ai_insights: {
    virality_score: number;
    predicted_peak: string;
    expected_duration: number;
    confidence: number;
    market_impact: string;
    recommended_actions: string[];
    similar_historical_trends: Array<{
      id: string;
      description: string;
      peak_reached: any;
      roi: number;
    }>;
  };
  financial_metrics: {
    potential_revenue: number;
    market_cap_impact: number;
    investment_opportunity: boolean;
    risk_level: 'low' | 'medium' | 'high';
  };
  geographic_distribution: Array<{
    region: string;
    engagement: number;
    growth_rate: number;
  }>;
  demographic_insights: {
    age_groups: Record<string, number>;
    interests: string[];
    income_brackets: Record<string, number>;
  };
}

// ML Model simulation for virality prediction
function predictVirality(trend: TrendData): number {
  // Factors that influence virality
  const factors = {
    validation_ratio: trend.validation_ratio * 0.3,
    validation_count: Math.min(trend.validation_count / 100, 1) * 0.2,
    has_screenshot: trend.screenshot_url ? 0.15 : 0,
    evidence_quality: trend.evidence ? 0.1 : 0,
    category_boost: getCategoryBoost(trend.category),
    recency: getRecencyScore(trend.created_at)
  };
  
  return Math.min(1, Object.values(factors).reduce((a, b) => a + b, 0));
}

function getCategoryBoost(category: string): number {
  const boosts: Record<string, number> = {
    'tech': 0.15,
    'entertainment': 0.12,
    'fashion': 0.10,
    'finance': 0.08,
    'health': 0.07,
    'food': 0.06,
    'sports': 0.05,
    'travel': 0.04
  };
  return boosts[category] || 0.03;
}

function getRecencyScore(createdAt: string): number {
  const hoursSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation < 1) return 0.2;
  if (hoursSinceCreation < 6) return 0.15;
  if (hoursSinceCreation < 24) return 0.1;
  if (hoursSinceCreation < 72) return 0.05;
  return 0;
}

function predictPeakDate(viralityScore: number): string {
  // Higher virality = sooner peak
  const daysToP

 = Math.floor(14 * (1 - viralityScore) + 3);
  const peakDate = new Date();
  peakDate.setDate(peakDate.getDate() + daysToP

);
  return peakDate.toISOString();
}

function calculateExpectedDuration(viralityScore: number): number {
  // Higher virality = longer duration
  return Math.floor(7 + viralityScore * 30);
}

function determineMarketImpact(viralityScore: number, category: string): string {
  if (viralityScore > 0.8) return 'High';
  if (viralityScore > 0.6) return 'Moderate';
  if (viralityScore > 0.4) return 'Emerging';
  return 'Low';
}

function generateRecommendedActions(trend: TrendData, viralityScore: number): string[] {
  const actions = [];
  
  if (viralityScore > 0.8) {
    actions.push('Immediate activation recommended');
    actions.push('Allocate premium resources');
    actions.push('Deploy multi-channel campaign');
  } else if (viralityScore > 0.6) {
    actions.push('Monitor closely');
    actions.push('Prepare campaign materials');
    actions.push('Test with focus groups');
  } else if (viralityScore > 0.4) {
    actions.push('Add to watchlist');
    actions.push('Gather more data');
    actions.push('Analyze competitor activity');
  } else {
    actions.push('Continue monitoring');
    actions.push('Low priority');
  }
  
  // Category-specific recommendations
  if (trend.category === 'tech') {
    actions.push('Engage tech influencers');
  } else if (trend.category === 'fashion') {
    actions.push('Partner with fashion creators');
  } else if (trend.category === 'finance') {
    actions.push('Ensure compliance review');
  }
  
  return actions;
}

function calculateFinancialMetrics(trend: TrendData, viralityScore: number): any {
  const baseValue = trend.validation_count * 100;
  const viralityMultiplier = 1 + (viralityScore * 4);
  
  const potentialRevenue = baseValue * viralityMultiplier;
  const marketCapImpact = potentialRevenue * 10;
  
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (viralityScore > 0.7 && trend.validation_ratio > 0.8) {
    riskLevel = 'low';
  } else if (viralityScore < 0.4 || trend.validation_ratio < 0.5) {
    riskLevel = 'high';
  }
  
  return {
    potential_revenue: Math.round(potentialRevenue),
    market_cap_impact: Math.round(marketCapImpact),
    investment_opportunity: viralityScore > 0.6 && riskLevel !== 'high',
    risk_level: riskLevel
  };
}

function generateGeographicDistribution(): any[] {
  const regions = [
    { region: 'North America', engagement: Math.random() * 40 + 30, growth_rate: Math.random() * 20 + 5 },
    { region: 'Europe', engagement: Math.random() * 30 + 20, growth_rate: Math.random() * 15 + 3 },
    { region: 'Asia Pacific', engagement: Math.random() * 25 + 15, growth_rate: Math.random() * 25 + 10 },
    { region: 'Latin America', engagement: Math.random() * 15 + 5, growth_rate: Math.random() * 18 + 7 },
    { region: 'Middle East', engagement: Math.random() * 10 + 5, growth_rate: Math.random() * 12 + 4 }
  ];
  
  return regions.map(r => ({
    ...r,
    engagement: Math.round(r.engagement),
    growth_rate: Math.round(r.growth_rate * 10) / 10
  }));
}

function generateDemographicInsights(category: string): any {
  const ageGroups: Record<string, number> = {
    '13-17': Math.random() * 15 + 5,
    '18-24': Math.random() * 25 + 20,
    '25-34': Math.random() * 30 + 25,
    '35-44': Math.random() * 20 + 15,
    '45-54': Math.random() * 15 + 10,
    '55+': Math.random() * 10 + 5
  };
  
  const categoryInterests: Record<string, string[]> = {
    'tech': ['Innovation', 'Gadgets', 'AI', 'Startups', 'Coding'],
    'fashion': ['Style', 'Luxury', 'Streetwear', 'Sustainability', 'Accessories'],
    'finance': ['Investing', 'Crypto', 'Real Estate', 'Savings', 'Trading'],
    'health': ['Fitness', 'Nutrition', 'Mental Health', 'Wellness', 'Medical'],
    'entertainment': ['Movies', 'Music', 'Gaming', 'Streaming', 'Celebrities'],
    'food': ['Restaurants', 'Cooking', 'Recipes', 'Delivery', 'Dietary'],
    'sports': ['Football', 'Basketball', 'Fitness', 'Extreme Sports', 'Olympics'],
    'travel': ['Adventure', 'Luxury Travel', 'Budget Travel', 'Culture', 'Hotels']
  };
  
  const incomeBrackets: Record<string, number> = {
    'Under $25K': Math.random() * 15 + 10,
    '$25K-$50K': Math.random() * 25 + 20,
    '$50K-$75K': Math.random() * 20 + 15,
    '$75K-$100K': Math.random() * 15 + 10,
    '$100K-$150K': Math.random() * 12 + 8,
    'Over $150K': Math.random() * 10 + 5
  };
  
  return {
    age_groups: Object.fromEntries(
      Object.entries(ageGroups).map(([k, v]) => [k, Math.round(v)])
    ),
    interests: categoryInterests[category] || ['General', 'Trending', 'Popular'],
    income_brackets: Object.fromEntries(
      Object.entries(incomeBrackets).map(([k, v]) => [k, Math.round(v)])
    )
  };
}

async function findSimilarHistoricalTrends(trend: TrendData, supabase: any): Promise<any[]> {
  try {
    // Query historical trends in the same category
    const { data: historicalTrends } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('category', trend.category)
      .gt('validation_ratio', 0.7)
      .order('validation_count', { ascending: false })
      .limit(5);
    
    if (!historicalTrends || historicalTrends.length === 0) {
      // Return mock data if no historical trends found
      return [
        {
          id: 'hist-1',
          description: 'Similar trend that went viral last month',
          peak_reached: '2M views',
          roi: 250
        },
        {
          id: 'hist-2',
          description: 'Related trend from Q3',
          peak_reached: '1.5M views',
          roi: 180
        }
      ];
    }
    
    return historicalTrends.slice(0, 3).map((ht: any) => ({
      id: ht.id,
      description: ht.description.substring(0, 100),
      peak_reached: `${Math.round(ht.validation_count * 10)}K views`,
      roi: Math.round(Math.random() * 300 + 100)
    }));
  } catch (error) {
    console.error('Error fetching historical trends:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { trends } = await request.json();
    
    if (!trends || !Array.isArray(trends)) {
      return NextResponse.json({ error: 'Invalid trends data' }, { status: 400 });
    }
    
    // Enhance each trend with ML predictions
    const enhancedTrends: EnhancedTrend[] = await Promise.all(
      trends.map(async (trend: TrendData) => {
        const viralityScore = predictVirality(trend);
        const confidence = 0.7 + Math.random() * 0.25; // 70-95% confidence
        
        const similarTrends = await findSimilarHistoricalTrends(trend, supabase);
        
        return {
          ...trend,
          ai_insights: {
            virality_score: viralityScore,
            predicted_peak: predictPeakDate(viralityScore),
            expected_duration: calculateExpectedDuration(viralityScore),
            confidence: confidence,
            market_impact: determineMarketImpact(viralityScore, trend.category),
            recommended_actions: generateRecommendedActions(trend, viralityScore),
            similar_historical_trends: similarTrends
          },
          financial_metrics: calculateFinancialMetrics(trend, viralityScore),
          geographic_distribution: generateGeographicDistribution(),
          demographic_insights: generateDemographicInsights(trend.category)
        };
      })
    );
    
    // Sort by virality score
    enhancedTrends.sort((a, b) => b.ai_insights.virality_score - a.ai_insights.virality_score);
    
    return NextResponse.json(enhancedTrends);
  } catch (error) {
    console.error('Error enhancing trends with ML:', error);
    return NextResponse.json(
      { error: 'Failed to enhance trends' },
      { status: 500 }
    );
  }
}