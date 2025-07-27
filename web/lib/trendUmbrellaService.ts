import { supabase } from './supabase';

interface TrendUmbrella {
  id: string;
  name: string;
  description?: string;
  submission_count: number;
  total_engagement: number;
  avg_virality_score: number;
  status: 'emerging' | 'trending' | 'viral' | 'declining';
  common_hashtags: string[];
  keywords: string[];
}

export class TrendUmbrellaService {
  // Similarity threshold for grouping trends (0.8 = 80% similar)
  private static SIMILARITY_THRESHOLD = 0.8;

  /**
   * Find or create a trend umbrella for a new submission
   * Uses cosine similarity to find existing umbrellas or creates a new one
   */
  static async findOrCreateUmbrella(
    trendTitle: string,
    hashtags: string[] = [],
    description?: string
  ): Promise<string> {
    try {
      // First, check if an umbrella with exact name exists
      const { data: exactMatch } = await supabase
        .from('trend_umbrellas')
        .select('id')
        .ilike('name', trendTitle)
        .single();

      if (exactMatch) {
        return exactMatch.id;
      }

      // For now, create a new umbrella
      // In production, you would:
      // 1. Generate embedding for the trend title + description
      // 2. Use vector similarity search to find similar umbrellas
      // 3. Only create new if no similar ones exist

      const { data: newUmbrella, error } = await supabase
        .from('trend_umbrellas')
        .insert({
          name: trendTitle,
          description: description || `Trend umbrella for ${trendTitle}`,
          common_hashtags: hashtags,
          status: 'emerging'
        })
        .select('id')
        .single();

      if (error) throw error;
      return newUmbrella.id;

    } catch (error) {
      console.error('Error finding/creating trend umbrella:', error);
      throw error;
    }
  }

  /**
   * Get all trend umbrellas with their statistics
   */
  static async getTrendUmbrellas(
    status?: string,
    limit: number = 20
  ): Promise<TrendUmbrella[]> {
    try {
      let query = supabase
        .from('trend_umbrellas')
        .select('*')
        .order('total_engagement', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching trend umbrellas:', error);
      return [];
    }
  }

  /**
   * Get submissions under a specific trend umbrella
   */
  static async getUmbrellaSubmissions(umbrellaId: string) {
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          users!spotter_id (username, email)
        `)
        .eq('trend_umbrella_id', umbrellaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching umbrella submissions:', error);
      return [];
    }
  }

  /**
   * Update trend umbrella status based on engagement metrics
   */
  static async updateUmbrellaStatus(umbrellaId: string) {
    try {
      // Get current stats
      const { data: umbrella } = await supabase
        .from('trend_umbrellas')
        .select('submission_count, total_engagement, created_at')
        .eq('id', umbrellaId)
        .single();

      if (!umbrella) return;

      // Simple status determination based on engagement
      let status: string = 'emerging';
      const avgEngagementPerSubmission = umbrella.total_engagement / (umbrella.submission_count || 1);
      
      if (umbrella.submission_count > 100 && avgEngagementPerSubmission > 10000) {
        status = 'viral';
      } else if (umbrella.submission_count > 50 && avgEngagementPerSubmission > 5000) {
        status = 'trending';
      } else if (umbrella.submission_count > 20) {
        status = 'trending';
      }

      // Update status
      await supabase
        .from('trend_umbrellas')
        .update({ status })
        .eq('id', umbrellaId);

    } catch (error) {
      console.error('Error updating umbrella status:', error);
    }
  }

  /**
   * Get trending umbrellas for dashboard display
   */
  static async getTrendingUmbrellas() {
    try {
      const { data, error } = await supabase
        .from('trend_umbrellas')
        .select('*')
        .in('status', ['trending', 'viral'])
        .order('total_engagement', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trending umbrellas:', error);
      return [];
    }
  }
}