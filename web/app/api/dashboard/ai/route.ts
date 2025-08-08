import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { subscriptionService } from '@/lib/subscriptionService';

/**
 * AI-Enhanced Dashboard API
 * Provides trend data with AI insights based on subscription tier
 */

// GET /api/dashboard/ai/overview
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get user tier
    const tier = await subscriptionService.getUserTier(user.id);
    
    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const endpoint = searchParams.get('endpoint') || 'overview';
    const period = searchParams.get('period') || '7d';
    const category = searchParams.get('category');
    const region = searchParams.get('region');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), getTierLimit(tier));

    // Route to appropriate handler
    switch (endpoint) {
      case 'overview':
        return await handleOverview(user.id, tier, period, category, region);
      
      case 'trends':
        return await handleTrends(user.id, tier, category, region, limit);
      
      case 'predictions':
        return await handlePredictions(user.id, tier, category, limit);
      
      case 'diffusion':
        return await handleDiffusion(user.id, tier, searchParams.get('trend_id'));
      
      case 'search':
        return await handleSearch(user.id, tier, searchParams.get('q'), category, limit);
      
      default:
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Overview endpoint - summary statistics
 */
async function handleOverview(
  userId: string,
  tier: string,
  period: string,
  category?: string | null,
  region?: string | null
) {
  // Calculate date range based on tier
  const startDate = getStartDateForPeriod(period, tier);
  
  // Build query
  let query = supabase
    .from('trends')
    .select(`
      id,
      category,
      submission_count,
      persona_diversity,
      geo_spread,
      trend_scores!inner (
        total_score,
        velocity
      )
    `)
    .gte('first_seen', startDate.toISOString());

  if (category) {
    query = query.eq('category', category);
  }

  const { data: trends, error } = await query;

  if (error) throw error;

  // Calculate overview stats
  const categoryCount = new Map<string, number>();
  const fastestRisers: any[] = [];
  const hotRegions = new Map<string, number>();

  trends?.forEach((trend: any) => {
    // Count by category
    categoryCount.set(trend.category, (categoryCount.get(trend.category) || 0) + 1);
    
    // Track fastest risers
    const latestScore = trend.trend_scores?.[0];
    if (latestScore && latestScore.velocity > 5) {
      fastestRisers.push({
        trend_id: trend.id,
        category: trend.category,
        velocity: latestScore.velocity,
        score: latestScore.total_score
      });
    }
  });

  // Sort and limit based on tier
  const topCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, tier === 'core' ? 5 : tier === 'professional' ? 10 : 20)
    .map(([name, count]) => ({ name, trend_count: count }));

  const topRisers = fastestRisers
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, tier === 'core' ? 10 : tier === 'professional' ? 50 : 100);

  // Log access
  await subscriptionService.logFeatureAccess(userId, 'dashboard_overview', 'view', {
    tier,
    period,
    category
  });

  return NextResponse.json({
    period,
    tier,
    stats: {
      total_trends: trends?.length || 0,
      avg_velocity: trends?.reduce((sum: number, t: any) => 
        sum + (t.trend_scores?.[0]?.velocity || 0), 0) / (trends?.length || 1),
      top_categories: topCategories,
      fastest_risers: topRisers
    }
  });
}

/**
 * Trends endpoint - detailed trend list with AI insights
 */
async function handleTrends(
  userId: string,
  tier: string,
  category?: string | null,
  region?: string | null,
  limit: number = 20
) {
  // Build query with AI enhancements
  let query = supabase
    .from('trends')
    .select(`
      *,
      trend_scores (
        total_score,
        velocity,
        momentum_score,
        calculated_at
      ),
      trend_predictions (
        days_to_mainstream,
        mainstream_probability,
        lifecycle_stage,
        prediction_confidence,
        predicted_at
      )
    `)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data: trends, error } = await query;

  if (error) throw error;

  // Filter data based on tier
  let processedTrends = trends || [];

  if (tier === 'core') {
    // Core tier: basic data only
    processedTrends = processedTrends.map((t: any) => ({
      id: t.id,
      text: t.representative_text,
      category: t.category,
      submission_count: t.submission_count,
      first_seen: t.first_seen,
      last_seen: t.last_seen
    }));
  } else if (tier === 'professional') {
    // Pro tier: add scores and basic predictions
    processedTrends = processedTrends.map((t: any) => ({
      ...t,
      trend_predictions: t.trend_predictions?.slice(0, 1) // Latest prediction only
    }));
  }
  // Enterprise tier gets everything

  // Log access
  await subscriptionService.logFeatureAccess(userId, 'dashboard_trends', 'view', {
    tier,
    category,
    count: processedTrends.length
  });

  return NextResponse.json({
    trends: processedTrends,
    count: processedTrends.length,
    tier_features: getTierFeatures(tier)
  });
}

/**
 * Predictions endpoint - AI predictions and alerts
 */
async function handlePredictions(
  userId: string,
  tier: string,
  category?: string | null,
  limit: number = 20
) {
  // Check tier access
  if (tier === 'core') {
    return NextResponse.json({ 
      error: 'Predictions require Professional tier or higher' 
    }, { status: 403 });
  }

  // Fetch trends with predictions
  let query = supabase
    .from('trend_predictions')
    .select(`
      *,
      trend:trends!inner (
        id,
        representative_text,
        category,
        submission_count,
        persona_diversity,
        geo_spread
      )
    `)
    .lte('days_to_mainstream', 30) // Focus on near-term predictions
    .gte('prediction_confidence', 0.6)
    .order('days_to_mainstream', { ascending: true })
    .limit(limit);

  const { data: predictions, error } = await query;

  if (error) throw error;

  // Format predictions based on tier
  const alerts = predictions?.map((p: any) => ({
    trend_id: p.trend.id,
    trend_text: p.trend.representative_text,
    category: p.trend.category,
    days_to_mainstream: p.days_to_mainstream,
    mainstream_probability: p.mainstream_probability,
    lifecycle_stage: p.lifecycle_stage,
    confidence: p.prediction_confidence,
    recommended_action: getRecommendedAction(p.lifecycle_stage, p.days_to_mainstream),
    // Enterprise only
    ...(tier === 'enterprise' ? {
      peak_date: p.peak_date,
      decline_date: p.decline_date,
      metadata: p.prediction_metadata
    } : {})
  }));

  // Log access
  await subscriptionService.logFeatureAccess(userId, 'dashboard_predictions', 'view', {
    tier,
    count: alerts?.length || 0
  });

  return NextResponse.json({
    predictions: alerts,
    tier
  });
}

/**
 * Diffusion endpoint - cultural diffusion analysis
 */
async function handleDiffusion(
  userId: string,
  tier: string,
  trendId?: string | null
) {
  // Check tier access
  if (tier === 'core') {
    return NextResponse.json({ 
      error: 'Diffusion analysis requires Professional tier or higher' 
    }, { status: 403 });
  }

  if (!trendId) {
    return NextResponse.json({ 
      error: 'Trend ID required' 
    }, { status: 400 });
  }

  // Fetch trend with all submissions
  const { data: submissions, error } = await supabase
    .from('submission_trend_map')
    .select(`
      submission_id,
      similarity_score,
      trend_submissions!inner (
        spotter_id,
        created_at,
        geo_location,
        user_profiles!inner (
          id,
          username
        ),
        user_persona_map!inner (
          persona_cluster_id,
          persona_clusters!inner (
            id,
            name,
            is_mainstream
          )
        )
      )
    `)
    .eq('trend_id', trendId);

  if (error) throw error;

  // Build diffusion graph
  const personaNodes = new Map<string, any>();
  const edges: any[] = [];
  const geoPath: any[] = [];

  submissions?.forEach((sub: any) => {
    const persona = sub.trend_submissions?.user_persona_map?.[0]?.persona_clusters;
    if (persona) {
      if (!personaNodes.has(persona.id)) {
        personaNodes.set(persona.id, {
          id: persona.id,
          label: persona.name,
          is_mainstream: persona.is_mainstream,
          first_seen: sub.trend_submissions.created_at
        });
      }
    }

    if (sub.trend_submissions?.geo_location) {
      geoPath.push({
        region: sub.trend_submissions.geo_location.region,
        timestamp: sub.trend_submissions.created_at
      });
    }
  });

  // Calculate diffusion edges (simplified)
  const personas = Array.from(personaNodes.values());
  for (let i = 0; i < personas.length - 1; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const timeDiff = new Date(personas[j].first_seen).getTime() - 
                       new Date(personas[i].first_seen).getTime();
      const lagDays = timeDiff / (1000 * 60 * 60 * 24);
      
      if (lagDays > 0 && lagDays < 30) {
        edges.push({
          source: personas[i].id,
          target: personas[j].id,
          weight: 1 / (1 + lagDays),
          lag_days: Math.round(lagDays)
        });
      }
    }
  }

  // Sort geo path by time
  geoPath.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Log access
  await subscriptionService.logFeatureAccess(userId, 'dashboard_diffusion', 'view', {
    tier,
    trend_id: trendId
  });

  return NextResponse.json({
    trend_id: trendId,
    personas: personas.slice(0, tier === 'professional' ? 10 : 50),
    edges: edges.slice(0, tier === 'professional' ? 20 : 100),
    geo_path: geoPath.slice(0, tier === 'professional' ? 10 : 50),
    tier
  });
}

/**
 * Search endpoint - semantic search
 */
async function handleSearch(
  userId: string,
  tier: string,
  query?: string | null,
  category?: string | null,
  limit: number = 20
) {
  if (!query) {
    return NextResponse.json({ 
      error: 'Search query required' 
    }, { status: 400 });
  }

  // Generate embedding for search query
  const { aiProcessingService } = await import('@/lib/aiProcessingService');
  const queryEmbedding = await aiProcessingService.generateEmbedding(query);

  // Perform vector search
  const similarTrends = await aiProcessingService.findSimilarTrends(
    queryEmbedding,
    0.7, // Lower threshold for search
    limit
  );

  // Fetch full trend data
  const trendIds = similarTrends.map(t => t.id);
  
  const { data: trends, error } = await supabase
    .from('trends')
    .select(`
      *,
      trend_scores (
        total_score,
        velocity
      ),
      trend_predictions (
        days_to_mainstream,
        lifecycle_stage
      )
    `)
    .in('id', trendIds);

  if (error) throw error;

  // Sort by similarity score
  const sortedTrends = trends?.map((trend: any) => {
    const similarity = similarTrends.find(s => s.id === trend.id)?.similarity || 0;
    return {
      ...trend,
      similarity_score: similarity
    };
  }).sort((a, b) => b.similarity_score - a.similarity_score);

  // Log access
  await subscriptionService.logFeatureAccess(userId, 'dashboard_search', 'view', {
    tier,
    query: query.substring(0, 50),
    results: sortedTrends?.length || 0
  });

  return NextResponse.json({
    query,
    results: sortedTrends,
    count: sortedTrends?.length || 0,
    tier
  });
}

// Helper functions
function getTierLimit(tier: string): number {
  const limits: Record<string, number> = {
    free: 0,
    core: 10,
    professional: 50,
    enterprise: 200
  };
  return limits[tier] || 10;
}

function getStartDateForPeriod(period: string, tier: string): Date {
  const now = new Date();
  
  if (tier === 'enterprise' && period === 'all') {
    return new Date('2020-01-01');
  }
  
  switch (period) {
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

function getTierFeatures(tier: string): string[] {
  const features: Record<string, string[]> = {
    core: ['basic_trends', 'monthly_updates'],
    professional: ['real_time', 'predictions', 'persona_analysis', 'diffusion_maps'],
    enterprise: ['ai_predictions', 'full_history', 'api_access', 'custom_models', 'white_label']
  };
  return features[tier] || [];
}

function getRecommendedAction(stage: string, daysToMainstream: number): string {
  if (stage === 'explosive' && daysToMainstream < 14) {
    return 'Immediate campaign activation recommended - trend at peak velocity';
  } else if (stage === 'growing' && daysToMainstream < 30) {
    return 'Prepare content strategy - trend showing strong growth signals';
  } else if (stage === 'trending') {
    return 'Monitor closely for acceleration - early adoption opportunity';
  } else if (stage === 'declining') {
    return 'Consider exit strategy - trend showing decline signals';
  } else {
    return 'Track for early signals - trend in discovery phase';
  }
}