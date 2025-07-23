import { supabase } from '../config/supabase';
import PointsService from './PointsService';

export interface ValidationQueueItem {
  id: string;
  trend_id: string;
  url: string;
  platform: string;
  title: string;
  description: string;
  hashtags: string;
  submitted_by: string;
  submitted_at: string;
  validation_count: number;
  positive_votes: number;
  skip_count: number;
  category?: string;
}

export interface ValidationVote {
  trend_id: string;
  user_id: string;
  vote: 'yes' | 'no' | 'skip';
  timestamp: string;
}

class ValidationService {
  private static instance: ValidationService;
  private userSkipCount: Map<string, number> = new Map();
  
  private constructor() {}
  
  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  /**
   * Get next trend for validation
   */
  async getNextValidationItem(userId: string): Promise<ValidationQueueItem | null> {
    try {
      // Get user's voting history to exclude already voted trends
      const { data: votedTrends } = await supabase
        .from('validations')
        .select('trend_id')
        .eq('user_id', userId);
      
      const votedIds = votedTrends?.map(v => v.trend_id) || [];
      
      // Get trends that need validation
      let query = supabase
        .from('captured_trends')
        .select(`
          *,
          validations (count),
          users!user_id (username)
        `)
        .eq('status', 'pending_validation')
        .lt('validation_count', 10) // Need at least 10 votes
        .order('captured_at', { ascending: true }); // Time decay - older first
      
      if (votedIds.length > 0) {
        query = query.not('id', 'in', `(${votedIds.join(',')})`);
      }
      
      const { data: trends, error } = await query.limit(10);
      
      if (error) throw error;
      if (!trends || trends.length === 0) return null;
      
      // Smart ordering algorithm
      const scoredTrends = trends.map(trend => {
        let score = 0;
        
        // Time decay factor (older trends get priority)
        const ageInHours = (Date.now() - new Date(trend.captured_at).getTime()) / (1000 * 60 * 60);
        score += Math.min(ageInHours * 2, 100);
        
        // Mix new and established users
        const isNewUser = trend.users?.trends_spotted < 5;
        score += isNewUser ? 20 : 10;
        
        // Category rotation (pseudo-random based on user ID and date)
        const dateHash = new Date().getDate() + userId.charCodeAt(0);
        const categoryBonus = (dateHash % 5) === trends.indexOf(trend) ? 30 : 0;
        score += categoryBonus;
        
        // Fewer validations get priority
        score += (10 - trend.validation_count) * 5;
        
        return { ...trend, score };
      });
      
      // Sort by score and return the highest
      scoredTrends.sort((a, b) => b.score - a.score);
      
      const selected = scoredTrends[0];
      
      return {
        id: selected.id,
        trend_id: selected.id,
        url: selected.url,
        platform: selected.platform,
        title: selected.title,
        description: selected.description,
        hashtags: selected.hashtags,
        submitted_by: selected.users?.username || 'Anonymous',
        submitted_at: selected.captured_at,
        validation_count: selected.validation_count || 0,
        positive_votes: selected.positive_votes || 0,
        skip_count: selected.skip_count || 0,
        category: selected.category,
      };
    } catch (error) {
      console.error('Error getting validation item:', error);
      return null;
    }
  }

  /**
   * Submit validation vote
   */
  async submitVote(
    trendId: string,
    userId: string,
    vote: 'yes' | 'no' | 'skip'
  ): Promise<{ success: boolean; points?: number; consensus?: boolean }> {
    try {
      // Check skip protection
      if (vote === 'skip') {
        const skipCount = this.userSkipCount.get(userId) || 0;
        if (skipCount >= 3) {
          throw new Error('You cannot skip more than 3 trends in a row. Please vote yes or no.');
        }
        this.userSkipCount.set(userId, skipCount + 1);
      } else {
        // Reset skip count on actual vote
        this.userSkipCount.set(userId, 0);
      }
      
      // Record the vote
      const { error: voteError } = await supabase
        .from('validations')
        .insert({
          trend_id: trendId,
          user_id: userId,
          vote,
          timestamp: new Date().toISOString(),
        });
      
      if (voteError) throw voteError;
      
      // Update trend statistics
      const updates: any = {
        validation_count: supabase.sql`validation_count + 1`,
      };
      
      if (vote === 'yes') {
        updates.positive_votes = supabase.sql`positive_votes + 1`;
      } else if (vote === 'skip') {
        updates.skip_count = supabase.sql`skip_count + 1`;
      }
      
      const { data: updatedTrend, error: updateError } = await supabase
        .from('captured_trends')
        .update(updates)
        .eq('id', trendId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Award participation points
      let pointsAwarded = 0;
      if (vote !== 'skip') {
        const result = await PointsService.awardPoints(userId, 'validation_vote', { 
          trend_id: trendId 
        });
        pointsAwarded = result.points;
      }
      
      // Check for consensus (70% agreement after 10 votes)
      const validationCount = updatedTrend.validation_count;
      const positiveVotes = updatedTrend.positive_votes;
      
      if (validationCount >= 10) {
        const approvalRate = positiveVotes / validationCount;
        
        if (approvalRate >= 0.7) {
          // Trend validated!
          await this.validateTrend(trendId, updatedTrend.user_id);
          
          // Award accuracy bonus if user voted with majority
          if (vote === 'yes') {
            const accuracyResult = await PointsService.awardPoints(
              userId, 
              'validation_accuracy',
              { trend_id: trendId }
            );
            pointsAwarded += accuracyResult.points;
          }
          
          return { success: true, points: pointsAwarded, consensus: true };
        } else if (approvalRate <= 0.3) {
          // Trend rejected
          await this.rejectTrend(trendId);
          
          // Award accuracy bonus if user voted with majority
          if (vote === 'no') {
            const accuracyResult = await PointsService.awardPoints(
              userId, 
              'validation_accuracy',
              { trend_id: trendId }
            );
            pointsAwarded += accuracyResult.points;
          }
          
          return { success: true, points: pointsAwarded, consensus: true };
        }
      }
      
      // Update user's validation stats
      await this.updateUserValidationStats(userId, vote);
      
      return { success: true, points: pointsAwarded, consensus: false };
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  }

  /**
   * Validate a trend that reached consensus
   */
  private async validateTrend(trendId: string, submitterId: string): Promise<void> {
    try {
      // Update trend status
      await supabase
        .from('captured_trends')
        .update({ 
          status: 'validated',
          validated_at: new Date().toISOString(),
        })
        .eq('id', trendId);
      
      // Award points to trend submitter
      await PointsService.awardPoints(submitterId, 'trend_validated', { 
        trend_id: trendId 
      });
      
      // Update submitter's stats
      await supabase
        .from('users')
        .update({
          validated_trends: supabase.sql`validated_trends + 1`,
        })
        .eq('id', submitterId);
    } catch (error) {
      console.error('Error validating trend:', error);
    }
  }

  /**
   * Reject a trend that didn't reach consensus
   */
  private async rejectTrend(trendId: string): Promise<void> {
    try {
      await supabase
        .from('captured_trends')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', trendId);
    } catch (error) {
      console.error('Error rejecting trend:', error);
    }
  }

  /**
   * Update user's validation statistics
   */
  private async updateUserValidationStats(userId: string, vote: string): Promise<void> {
    try {
      if (vote !== 'skip') {
        await supabase
          .from('users')
          .update({
            validations_count: supabase.sql`validations_count + 1`,
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error updating user validation stats:', error);
    }
  }

  /**
   * Get user's validation history
   */
  async getUserValidationHistory(userId: string, limit = 50): Promise<ValidationVote[]> {
    try {
      const { data, error } = await supabase
        .from('validations')
        .select(`
          *,
          captured_trends (title, platform, status)
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching validation history:', error);
      return [];
    }
  }

  /**
   * Get validation statistics
   */
  async getValidationStats(userId: string): Promise<{
    totalVotes: number;
    accuracy: number;
    streak: number;
  }> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('validations_count, accuracy_score')
        .eq('id', userId)
        .single();
      
      const streak = await PointsService.getUserStreak(userId);
      
      return {
        totalVotes: user?.validations_count || 0,
        accuracy: (user?.accuracy_score || 0) * 100,
        streak,
      };
    } catch (error) {
      console.error('Error fetching validation stats:', error);
      return { totalVotes: 0, accuracy: 0, streak: 0 };
    }
  }
}

export default ValidationService.getInstance();