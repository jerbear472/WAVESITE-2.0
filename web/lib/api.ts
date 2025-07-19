import axios from 'axios';
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Helper functions
const calculateGrowthRate = (timeline: any[]) => {
  if (!timeline || timeline.length < 2) return 0;
  
  const sortedTimeline = timeline.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const firstValue = sortedTimeline[0].wave_score || 0;
  const lastValue = sortedTimeline[sortedTimeline.length - 1].wave_score || 0;
  
  if (firstValue === 0) return 0;
  return ((lastValue - firstValue) / firstValue) * 100;
};

const extractInsightTitle = (description: string) => {
  // Extract a concise title from the description
  const firstPart = description.split('-')[0];
  return firstPart.length > 60 ? firstPart.substring(0, 60) + '...' : firstPart;
};

export const api = {
  // Trends with timeline data
  getTrends: async ({ category = 'all', timeframe = 'week' }) => {
    // Calculate date range based on timeframe
    const now = new Date();
    const startDate = new Date();
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Build query
    let query = supabase
      .from('trend_submissions')
      .select(`
        *,
        spotter:users!spotter_id(username, display_name),
        timeline:trend_timeline(
          timestamp,
          wave_score,
          validation_count,
          engagement_rate,
          platform_reach
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('wave_score', { ascending: false });

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching trends:', error);
      return [];
    }

    // Transform data to match expected format
    return data?.map(trend => {
      // Get the latest wave score from timeline
      const sortedTimeline = trend.timeline?.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const latestWaveScore = sortedTimeline?.[0]?.wave_score || 0;
      
      return {
        id: trend.id,
        name: trend.description.substring(0, 50) + '...',
        category: trend.category,
        waveScore: latestWaveScore,
        growth: calculateGrowthRate(trend.timeline),
        timeline: trend.timeline
          ?.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          ?.map((point: any) => ({
            timestamp: point.timestamp,
            value: point.wave_score
          })) || []
      };
    }) || [];
  },

  // Insights from trend data
  getInsights: async ({ timeframe = 'week' }) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timeframe === 'week' ? 7 : 30));

    const { data, error } = await supabase
      .from('trend_submissions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .in('status', ['approved', 'viral'])
      .order('virality_prediction', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching insights:', error);
      return [];
    }

    return data?.map(trend => ({
      id: trend.id,
      title: extractInsightTitle(trend.description),
      description: trend.description,
      category: trend.category,
      impact: trend.virality_prediction >= 8 ? 'high' : trend.virality_prediction >= 6 ? 'medium' : 'low',
      createdAt: trend.created_at,
    })) || [];
  },

  // Top trend spotters
  getCompetitors: async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        trend_count:trend_submissions(count)
      `)
      .order('reputation_score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching competitors:', error);
      return [];
    }

    return data?.map(user => ({
      id: user.id,
      name: user.username || user.display_name || 'Anonymous',
      platform: 'Multi-platform',
      recentActivity: `${user.trend_count?.[0]?.count || 0} trends spotted`,
      trendCount: user.trend_count?.[0]?.count || 0,
      lastActive: new Date(user.last_active || user.created_at).toLocaleString(),
    })) || [];
  },

  // Submit trend
  submitTrend: async (trendData: any) => {
    const response = await apiClient.post('/api/v1/trends/submit', trendData);
    return response.data;
  },

  // Validate trend
  validateTrend: async (trendId: string, validation: any) => {
    const response = await apiClient.post(`/api/v1/trends/validate/${trendId}`, validation);
    return response.data;
  },
};