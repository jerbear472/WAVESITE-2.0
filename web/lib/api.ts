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

export const api = {
  // Trends
  getTrends: async ({ category = 'all', timeframe = 'week' }) => {
    const params = new URLSearchParams();
    if (category !== 'all') params.append('category', category);
    params.append('timeframe', timeframe);
    
    const response = await apiClient.get(`/api/v1/trends/trending?${params}`);
    return response.data;
  },

  // Insights
  getInsights: async ({ timeframe = 'week' }) => {
    // For now, return mock data
    return [
      {
        id: '1',
        title: 'Neon aesthetics trending up',
        description: 'Neon color schemes seeing 45% increase in usage across TikTok',
        category: 'visual_style',
        impact: 'high' as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Audio remix format emerging',
        description: 'New remix style combining classical with trap beats',
        category: 'audio_music',
        impact: 'medium' as const,
        createdAt: new Date().toISOString(),
      },
    ];
  },

  // Competitors
  getCompetitors: async () => {
    // For now, return mock data
    return [
      {
        id: '1',
        name: 'TrendHunter',
        platform: 'TikTok',
        recentActivity: 'Spotted dance trend early',
        trendCount: 45,
        lastActive: '2 hours ago',
      },
      {
        id: '2',
        name: 'ViralScout',
        platform: 'Instagram',
        recentActivity: 'Identified emerging filter',
        trendCount: 38,
        lastActive: '5 hours ago',
      },
    ];
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