import { createClient } from '@supabase/supabase-js';
import { TrendIntelligenceData } from '@/lib/trendIntelligenceConfig';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class TrendIntelligenceService {
  /**
   * Submit trend intelligence data to the database
   */
  static async submitTrendIntelligence(
    userId: string,
    data: TrendIntelligenceData
  ): Promise<{ success: boolean; trendId?: string; error?: string }> {
    try {
      // Prepare the main trend submission data
      const trendSubmission = {
        spotter_id: userId,
        
        // Basic info
        trend_title: data.title,
        description: data.title, // Using title as description for now
        platform: data.platform,
        post_url: data.url,
        category: data.category,
        
        // Universal intelligence
        trend_velocity: data.trendDynamics.velocity,
        platform_spread: data.trendDynamics.platformSpread,
        trend_size: data.trendDynamics.size,
        ai_origin: data.aiDetection.origin,
        ai_reasoning: data.aiDetection.reasoning,
        audience_sentiment: data.audienceIntelligence.sentiment,
        audience_demographics: data.audienceIntelligence.demographics,
        audience_subcultures: data.audienceIntelligence.subcultures,
        brand_presence: data.audienceIntelligence.brandPresence,
        
        // Category-specific intelligence (stored as JSONB)
        category_intelligence: data.categorySpecific || {},
        
        // Context
        why_it_matters: data.context?.whyItMatters,
        trend_prediction: data.context?.prediction,
        
        // Social media metadata
        creator_handle: data.creatorHandle,
        creator_name: data.creatorName,
        post_caption: data.postCaption,
        likes_count: data.likesCount || 0,
        comments_count: data.commentsCount || 0,
        shares_count: data.sharesCount || 0,
        views_count: data.viewsCount || 0,
        hashtags: data.hashtags || [],
        thumbnail_url: data.thumbnailUrl,
        posted_at: data.postedAt,
        wave_score: data.waveScore || 50,
        
        // Status
        status: 'submitted',
        created_at: new Date().toISOString()
      };

      // Insert into trend_submissions table
      const { data: trend, error } = await supabase
        .from('trend_submissions')
        .insert(trendSubmission)
        .select('id')
        .single();

      if (error) {
        console.error('Error submitting trend intelligence:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to submit trend intelligence' 
        };
      }

      // Calculate and update the intelligence value score
      if (trend?.id) {
        await this.updateIntelligenceScore(trend.id);
      }

      return { 
        success: true, 
        trendId: trend?.id 
      };
    } catch (error) {
      console.error('Unexpected error in submitTrendIntelligence:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred' 
      };
    }
  }

  /**
   * Update the intelligence value score for a trend
   */
  static async updateIntelligenceScore(trendId: string): Promise<void> {
    try {
      // Call the database function to calculate the score
      const { data, error } = await supabase
        .rpc('calculate_trend_intelligence_value', { p_trend_id: trendId });

      if (error) {
        console.error('Error calculating intelligence score:', error);
      }
    } catch (error) {
      console.error('Error updating intelligence score:', error);
    }
  }

  /**
   * Get trend intelligence by ID
   */
  static async getTrendIntelligence(trendId: string): Promise<TrendIntelligenceData | null> {
    try {
      const { data, error } = await supabase
        .from('trend_intelligence_view')
        .select('*')
        .eq('id', trendId)
        .single();

      if (error || !data) {
        return null;
      }

      // Map database fields back to TrendIntelligenceData structure
      return {
        title: data.trend_title || data.description,
        platform: data.platform,
        url: data.post_url,
        category: data.category,
        
        trendDynamics: {
          velocity: data.trend_velocity,
          platformSpread: data.platform_spread,
          size: data.trend_size
        },
        
        aiDetection: {
          origin: data.ai_origin,
          reasoning: data.ai_reasoning
        },
        
        audienceIntelligence: {
          sentiment: data.audience_sentiment,
          demographics: data.audience_demographics || [],
          subcultures: data.audience_subcultures || [],
          brandPresence: data.brand_presence
        },
        
        categorySpecific: data.category_intelligence || {},
        
        context: {
          whyItMatters: data.why_it_matters,
          prediction: data.trend_prediction
        },
        
        creatorHandle: data.creator_handle,
        creatorName: data.creator_name,
        postCaption: data.post_caption,
        likesCount: data.likes_count,
        commentsCount: data.comments_count,
        sharesCount: data.shares_count,
        viewsCount: data.views_count,
        hashtags: data.hashtags,
        thumbnailUrl: data.thumbnail_url,
        postedAt: data.posted_at,
        waveScore: data.wave_score
      };
    } catch (error) {
      console.error('Error fetching trend intelligence:', error);
      return null;
    }
  }

  /**
   * Get recent trend intelligence submissions
   */
  static async getRecentTrendIntelligence(
    limit: number = 10,
    offset: number = 0
  ): Promise<TrendIntelligenceData[]> {
    try {
      const { data, error } = await supabase
        .from('trend_intelligence_view')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) {
        return [];
      }

      return data.map(item => ({
        title: item.trend_title || item.description,
        platform: item.platform,
        url: item.post_url,
        category: item.category,
        
        trendDynamics: {
          velocity: item.trend_velocity,
          platformSpread: item.platform_spread,
          size: item.trend_size
        },
        
        aiDetection: {
          origin: item.ai_origin,
          reasoning: item.ai_reasoning
        },
        
        audienceIntelligence: {
          sentiment: item.audience_sentiment,
          demographics: item.audience_demographics || [],
          subcultures: item.audience_subcultures || [],
          brandPresence: item.brand_presence
        },
        
        categorySpecific: item.category_intelligence || {},
        
        context: {
          whyItMatters: item.why_it_matters,
          prediction: item.trend_prediction
        },
        
        creatorHandle: item.creator_handle,
        creatorName: item.creator_name,
        postCaption: item.post_caption,
        likesCount: item.likes_count,
        commentsCount: item.comments_count,
        sharesCount: item.shares_count,
        viewsCount: item.views_count,
        hashtags: item.hashtags,
        thumbnailUrl: item.thumbnail_url,
        postedAt: item.posted_at,
        waveScore: item.wave_score
      }));
    } catch (error) {
      console.error('Error fetching recent trend intelligence:', error);
      return [];
    }
  }

  /**
   * Search trend intelligence by various filters
   */
  static async searchTrendIntelligence(filters: {
    category?: string;
    platform?: string;
    velocity?: string;
    sentiment?: string;
    aiOrigin?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TrendIntelligenceData[]> {
    try {
      let query = supabase
        .from('trend_intelligence_view')
        .select('*');

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters.velocity) {
        query = query.eq('trend_velocity', filters.velocity);
      }
      if (filters.sentiment) {
        query = query.eq('audience_sentiment', filters.sentiment);
      }
      if (filters.aiOrigin) {
        query = query.eq('ai_origin', filters.aiOrigin);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query
        .order('intelligence_completeness_score', { ascending: false })
        .limit(50);

      if (error || !data) {
        return [];
      }

      return data.map(item => ({
        title: item.trend_title || item.description,
        platform: item.platform,
        url: item.post_url,
        category: item.category,
        
        trendDynamics: {
          velocity: item.trend_velocity,
          platformSpread: item.platform_spread,
          size: item.trend_size
        },
        
        aiDetection: {
          origin: item.ai_origin,
          reasoning: item.ai_reasoning
        },
        
        audienceIntelligence: {
          sentiment: item.audience_sentiment,
          demographics: item.audience_demographics || [],
          subcultures: item.audience_subcultures || [],
          brandPresence: item.brand_presence
        },
        
        categorySpecific: item.category_intelligence || {},
        
        context: {
          whyItMatters: item.why_it_matters,
          prediction: item.trend_prediction
        },
        
        creatorHandle: item.creator_handle,
        creatorName: item.creator_name,
        postCaption: item.post_caption,
        likesCount: item.likes_count,
        commentsCount: item.comments_count,
        sharesCount: item.shares_count,
        viewsCount: item.views_count,
        hashtags: item.hashtags,
        thumbnailUrl: item.thumbnail_url,
        postedAt: item.posted_at,
        waveScore: item.wave_score
      }));
    } catch (error) {
      console.error('Error searching trend intelligence:', error);
      return [];
    }
  }

  /**
   * Get aggregated intelligence insights
   */
  static async getIntelligenceInsights(): Promise<{
    totalTrends: number;
    trendsByCategory: { category: string; count: number }[];
    trendsByVelocity: { velocity: string; count: number }[];
    aiVsHuman: { origin: string; count: number }[];
    topSubcultures: { subculture: string; count: number }[];
  }> {
    try {
      // Get total trends
      const { count: totalTrends } = await supabase
        .from('trend_submissions')
        .select('*', { count: 'exact', head: true });

      // Get trends by category
      const { data: categoryData } = await supabase
        .from('trend_submissions')
        .select('category')
        .not('category', 'is', null);
      
      const trendsByCategory = Object.entries(
        (categoryData || []).reduce((acc: any, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {})
      ).map(([category, count]) => ({ category, count: count as number }));

      // Get trends by velocity
      const { data: velocityData } = await supabase
        .from('trend_submissions')
        .select('trend_velocity')
        .not('trend_velocity', 'is', null);
      
      const trendsByVelocity = Object.entries(
        (velocityData || []).reduce((acc: any, item) => {
          acc[item.trend_velocity] = (acc[item.trend_velocity] || 0) + 1;
          return acc;
        }, {})
      ).map(([velocity, count]) => ({ velocity, count: count as number }));

      // Get AI vs Human origin
      const { data: aiData } = await supabase
        .from('trend_submissions')
        .select('ai_origin')
        .not('ai_origin', 'is', null);
      
      const aiVsHuman = Object.entries(
        (aiData || []).reduce((acc: any, item) => {
          acc[item.ai_origin] = (acc[item.ai_origin] || 0) + 1;
          return acc;
        }, {})
      ).map(([origin, count]) => ({ origin, count: count as number }));

      // Get top subcultures (this is more complex due to array field)
      const { data: subcultureData } = await supabase
        .from('trend_submissions')
        .select('audience_subcultures')
        .not('audience_subcultures', 'is', null);
      
      const subcultureCounts: { [key: string]: number } = {};
      (subcultureData || []).forEach(item => {
        (item.audience_subcultures || []).forEach((subculture: string) => {
          subcultureCounts[subculture] = (subcultureCounts[subculture] || 0) + 1;
        });
      });
      
      const topSubcultures = Object.entries(subcultureCounts)
        .map(([subculture, count]) => ({ subculture, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalTrends: totalTrends || 0,
        trendsByCategory,
        trendsByVelocity,
        aiVsHuman,
        topSubcultures
      };
    } catch (error) {
      console.error('Error getting intelligence insights:', error);
      return {
        totalTrends: 0,
        trendsByCategory: [],
        trendsByVelocity: [],
        aiVsHuman: [],
        topSubcultures: []
      };
    }
  }
}