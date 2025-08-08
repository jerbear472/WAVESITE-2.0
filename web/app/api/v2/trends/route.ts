import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { subscriptionService } from '@/lib/subscriptionService';

// API endpoint for tiered access to trends data
export async function GET(request: NextRequest) {
  try {
    // Extract API key from headers
    const apiKey = request.headers.get('X-API-Key');
    const authHeader = request.headers.get('Authorization');
    
    let userId: string | null = null;
    let organizationId: string | null = null;
    let tier: 'free' | 'core' | 'professional' | 'enterprise' = 'free';
    
    // Check for API key (Enterprise only)
    if (apiKey) {
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('*, organization:organizations(*, subscription:user_subscriptions(*, tier:subscription_tiers(*)))')
        .eq('key_hash', apiKey)
        .single();
      
      if (keyError || !keyData) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return NextResponse.json({ error: 'API key expired' }, { status: 401 });
      }
      
      if (keyData.revoked_at) {
        return NextResponse.json({ error: 'API key revoked' }, { status: 401 });
      }
      
      organizationId = keyData.organization_id;
      tier = keyData.organization?.subscription?.tier?.name || 'free';
      
      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id);
      
      // Log API access
      await supabase.from('feature_access_log').insert({
        organization_id: organizationId,
        feature_name: 'api_trends',
        access_type: 'api_call',
        metadata: { endpoint: '/api/v2/trends' }
      });
    }
    // Check for Bearer token (all tiers)
    else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
      }
      
      userId = user.id;
      tier = await subscriptionService.getUserTier(userId);
    } else {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), getTierLimit(tier));
    const offset = parseInt(searchParams.get('offset') || '0');
    const timeframe = searchParams.get('timeframe') || '7d';
    const includeAI = searchParams.get('include_ai') === 'true';
    const includeHistorical = searchParams.get('include_historical') === 'true';
    
    // Check tier permissions
    if (includeAI && tier !== 'enterprise') {
      return NextResponse.json({ 
        error: 'AI predictions require Enterprise tier' 
      }, { status: 403 });
    }
    
    if (includeHistorical && tier !== 'enterprise') {
      return NextResponse.json({ 
        error: 'Historical data access requires Enterprise tier' 
      }, { status: 403 });
    }
    
    // Calculate date range based on tier
    const startDate = getStartDate(timeframe, tier);
    
    // Build query based on tier
    let query = supabase
      .from('trend_submissions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply category filter based on tier
    const allowedCategories = getAllowedCategories(tier);
    if (category !== 'all') {
      if (!allowedCategories.includes(category)) {
        return NextResponse.json({ 
          error: `Category '${category}' not available in your tier` 
        }, { status: 403 });
      }
      query = query.eq('category', category);
    } else {
      query = query.in('category', allowedCategories);
    }
    
    // Apply validation threshold based on tier
    const validationThreshold = getValidationThreshold(tier);
    query = query.gt('validation_ratio', validationThreshold);
    
    const { data: trends, error, count } = await query;
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
    }
    
    // Enhance data based on tier
    let enhancedTrends = trends || [];
    
    if (tier === 'professional' || tier === 'enterprise') {
      enhancedTrends = enhancedTrends.map(trend => ({
        ...trend,
        persona_segments: getPersonaSegments(trend),
        regional_data: tier === 'enterprise' ? getRegionalData(trend) : undefined
      }));
    }
    
    if (tier === 'enterprise' && includeAI) {
      enhancedTrends = enhancedTrends.map(trend => ({
        ...trend,
        ai_prediction: generateAIPrediction(trend)
      }));
    }
    
    // Log feature access
    if (userId) {
      await subscriptionService.logFeatureAccess(userId, 'api_trends', 'api_call', {
        category,
        limit,
        tier
      });
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedTrends,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0)
      },
      tier_info: {
        tier,
        limits: getTierLimits(tier),
        features: getTierFeatures(tier)
      }
    }, {
      headers: {
        'X-RateLimit-Limit': getRateLimit(tier).toString(),
        'X-RateLimit-Remaining': (getRateLimit(tier) - 1).toString(),
        'Cache-Control': tier === 'enterprise' ? 'no-cache' : 'public, max-age=60'
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper functions
function getTierLimit(tier: string): number {
  const limits: Record<string, number> = {
    free: 0,
    core: 10,
    professional: 100,
    enterprise: 1000
  };
  return limits[tier] || 0;
}

function getStartDate(timeframe: string, tier: string): Date {
  const now = new Date();
  
  if (tier === 'enterprise') {
    // Enterprise can access all historical data
    switch (timeframe) {
      case 'all':
        return new Date('2020-01-01');
      case '1y':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case '6m':
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      default:
        break;
    }
  }
  
  // Standard timeframes for all tiers
  switch (timeframe) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function getAllowedCategories(tier: string): string[] {
  const categories: Record<string, string[]> = {
    free: [],
    core: ['fashion', 'food', 'memes', 'music', 'tech'],
    professional: [
      'fashion', 'food', 'memes', 'music', 'tech',
      'sports', 'beauty', 'automotive', 'wellness',
      'entertainment', 'finance', 'health', 'travel', 'lifestyle'
    ],
    enterprise: [
      'fashion', 'food', 'memes', 'music', 'tech',
      'sports', 'beauty', 'automotive', 'wellness',
      'entertainment', 'finance', 'health', 'travel',
      'lifestyle', 'gaming', 'education', 'real_estate',
      'crypto', 'sustainability', 'politics', 'art',
      'science', 'business', 'social_causes'
    ]
  };
  return categories[tier] || [];
}

function getValidationThreshold(tier: string): number {
  const thresholds: Record<string, number> = {
    free: 0.9,
    core: 0.7,
    professional: 0.6,
    enterprise: 0.5
  };
  return thresholds[tier] || 0.9;
}

function getPersonaSegments(trend: any): string[] {
  // Simulate persona segment analysis
  const segments = [];
  if (trend.validation_ratio > 0.8) segments.push('early_adopters');
  if (trend.category === 'tech') segments.push('tech_enthusiasts');
  if (trend.category === 'fashion') segments.push('fashion_forward');
  return segments;
}

function getRegionalData(trend: any): Record<string, any> {
  // Simulate regional data
  return {
    us: { adoption: 0.65, growth: 0.12 },
    uk: { adoption: 0.45, growth: 0.08 },
    jp: { adoption: 0.38, growth: 0.15 },
    de: { adoption: 0.32, growth: 0.06 }
  };
}

function generateAIPrediction(trend: any): any {
  const hoursSinceCreation = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
  const velocity = trend.validation_count / Math.max(1, hoursSinceCreation);
  
  const mainstreamProbability = Math.min(0.95, trend.validation_ratio * 1.2 + (velocity / 100));
  const weeksToPeak = Math.max(2, Math.round(20 / (velocity + 1)));
  const peakDate = new Date();
  peakDate.setDate(peakDate.getDate() + (weeksToPeak * 7));
  
  return {
    mainstream_probability: mainstreamProbability,
    peak_date: peakDate.toISOString(),
    velocity,
    lifecycle_stage: velocity > 10 ? 'explosive' : velocity > 5 ? 'growing' : 'emerging',
    confidence: 0.85 + Math.random() * 0.1
  };
}

function getRateLimit(tier: string): number {
  const limits: Record<string, number> = {
    free: 0,
    core: 100,
    professional: 1000,
    enterprise: 10000
  };
  return limits[tier] || 0;
}

function getTierLimits(tier: string): any {
  const limits: Record<string, any> = {
    free: { trends_per_request: 0, requests_per_hour: 0 },
    core: { trends_per_request: 10, requests_per_hour: 100 },
    professional: { trends_per_request: 100, requests_per_hour: 1000 },
    enterprise: { trends_per_request: 1000, requests_per_hour: 10000 }
  };
  return limits[tier] || limits.free;
}

function getTierFeatures(tier: string): string[] {
  const features: Record<string, string[]> = {
    free: [],
    core: ['basic_trends', 'csv_export'],
    professional: ['real_time_feed', 'persona_segments', 'predictive_alerts', 'custom_tags'],
    enterprise: ['ai_predictions', 'historical_data', 'custom_personas', 'api_access', 'white_label']
  };
  return features[tier] || [];
}