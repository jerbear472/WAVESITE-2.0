/**
 * FINAL TREND SUBMISSION SERVICE
 * Uses ONLY the unified earnings system
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SUSTAINABLE_EARNINGS as EARNINGS, calculateTrendEarnings as previewTrendEarnings } from '@/lib/SUSTAINABLE_EARNINGS';

type Tier = 'learning' | 'bronze' | 'silver' | 'gold';
const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

interface SubmissionResult {
  success: boolean;
  trendId?: string;
  earnings?: number;
  message: string;
  error?: string;
}

interface TrendData {
  url: string;
  title?: string;
  description?: string;
  category?: string;
  platform?: string;
  screenshot?: File;
  metadata?: any;
}

export class TrendSubmissionService {
  private supabase;
  
  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Submit a trend - earnings calculated by database
   */
  async submitTrend(data: TrendData): Promise<SubmissionResult> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          message: 'Please log in to submit trends',
          error: 'Not authenticated',
        };
      }

      // Check for duplicate
      const { data: existing } = await this.supabase
        .from('captured_trends')
        .select('id')
        .eq('url', data.url)
        .eq('user_id', user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        return {
          success: false,
          message: 'You have already submitted this trend',
          error: 'Duplicate submission',
        };
      }

      // Upload screenshot if provided
      let screenshotUrl = null;
      if (data.screenshot) {
        const fileName = `${user.id}/${Date.now()}-screenshot.jpg`;
        const { data: upload, error: uploadError } = await this.supabase.storage
          .from('trend-screenshots')
          .upload(fileName, data.screenshot);

        if (!uploadError && upload) {
          const { data: { publicUrl } } = this.supabase.storage
            .from('trend-screenshots')
            .getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      // Calculate quality score
      const qualityScore = this.calculateQualityScore({
        ...data,
        screenshot_url: screenshotUrl,
      });

      // Submit trend (database will calculate earnings)
      const { data: trend, error: submitError } = await this.supabase
        .from('captured_trends')
        .insert([{
          user_id: user.id,
          url: data.url,
          title: data.title || 'Untitled',
          description: data.description,
          category: data.category || 'other',
          platform: data.platform || this.detectPlatform(data.url),
          screenshot_url: screenshotUrl,
          metadata: data.metadata || {},
          quality_score: qualityScore,
          validation_status: 'pending',
          approve_count: 0,
          reject_count: 0,
        }])
        .select()
        .single();

      if (submitError) {
        console.error('Submission error:', submitError);
        return {
          success: false,
          message: 'Failed to submit trend',
          error: submitError.message,
        };
      }

      // Get user tier for preview
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('performance_tier')
        .eq('user_id', user.id)
        .single();

      // Preview earnings (actual is calculated by database)
      const preview = previewTrendEarnings(
        { ...trend, screenshot_url: screenshotUrl },
        profile?.performance_tier || 'learning'
      );

      return {
        success: true,
        trendId: trend.id,
        earnings: trend.earnings || preview.capped,
        message: `Trend submitted! You earned ${formatMoney(trend.earnings || preview.capped)}`,
      };
    } catch (error: any) {
      console.error('Submission error:', error);
      return {
        success: false,
        message: 'Failed to submit trend',
        error: error.message,
      };
    }
  }

  /**
   * Calculate quality score for a trend
   */
  private calculateQualityScore(data: any): number {
    let score = 50; // Base score

    if (data.screenshot_url) score += 15;
    if (data.title && data.title.length > 10) score += 10;
    if (data.description && data.description.length > 30) score += 10;
    if (data.metadata?.view_count > 10000) score += 10;
    if (data.category && data.category !== 'other') score += 5;

    return Math.min(score, 100);
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): string {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('reddit.com')) return 'reddit';
    return 'other';
  }

  /**
   * Get user's submission history
   */
  async getUserSubmissions(limit: number = 10) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('captured_trends')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get user's earnings summary
   */
  async getEarningsSummary() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .rpc('get_user_earnings_summary', { p_user_id: user.id });

    return data?.[0] || null;
  }
}

// Validation service
export class ValidationService {
  private supabase;
  
  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Submit a validation vote
   */
  async submitVote(trendId: string, vote: 'approve' | 'reject') {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Not authenticated' };
    }

    // Check if already voted
    const { data: existing } = await this.supabase
      .from('trend_validations')
      .select('id')
      .eq('trend_id', trendId)
      .eq('user_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, message: 'Already voted on this trend' };
    }

    // Submit vote (database handles earnings)
    const { data, error } = await this.supabase
      .from('trend_validations')
      .insert([{
        trend_id: trendId,
        user_id: user.id,
        vote: vote,
      }])
      .select()
      .single();

    if (error) {
      return { success: false, message: 'Failed to submit vote' };
    }

    return {
      success: true,
      message: `Vote submitted! You earned ${formatMoney(EARNINGS.base.validationVote)}`,
      earnings: EARNINGS.base.validationVote,
    };
  }

  /**
   * Get trends to validate
   */
  async getTrendsToValidate(limit: number = 10) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    // Get user's voted trend IDs
    const { data: votes } = await this.supabase
      .from('trend_validations')
      .select('trend_id')
      .eq('user_id', user.id);

    const votedIds = votes?.map(v => v.trend_id) || [];

    // Get pending trends user hasn't voted on
    let query = this.supabase
      .from('captured_trends')
      .select('*')
      .eq('validation_status', 'pending')
      .neq('user_id', user.id)
      .limit(limit);

    if (votedIds.length > 0) {
      query = query.not('id', 'in', `(${votedIds.join(',')})`);
    }

    const { data } = await query;
    return data || [];
  }
}

// Export services
export default TrendSubmissionService;