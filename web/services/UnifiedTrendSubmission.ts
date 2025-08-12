import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UNIFIED_EARNINGS, calculateTrendEarnings, formatEarnings } from '@/lib/UNIFIED_EARNINGS_CONFIG';

interface SubmissionResult {
  success: boolean;
  trendId?: string;
  earnings?: number;
  breakdown?: string[];
  message: string;
  error?: string;
}

interface TrendSubmissionData {
  url: string;
  title?: string;
  description?: string;
  category?: string;
  platform?: string;
  screenshot?: File;
  metadata?: any;
  demographics_data?: any;
  creator_info?: any;
  hashtags?: string[];
  caption?: string;
}

export class UnifiedTrendSubmissionService {
  private supabase;
  private submissionQueue: Map<string, Promise<SubmissionResult>> = new Map();
  
  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Submit a new trend with automatic earnings calculation
   */
  async submitTrend(data: TrendSubmissionData): Promise<SubmissionResult> {
    try {
      // Check for duplicate submission in progress
      const queueKey = `${data.url}-${data.title}`;
      if (this.submissionQueue.has(queueKey)) {
        return await this.submissionQueue.get(queueKey)!;
      }

      // Create submission promise
      const submissionPromise = this.processSubmission(data);
      this.submissionQueue.set(queueKey, submissionPromise);

      // Process and clean up
      const result = await submissionPromise;
      this.submissionQueue.delete(queueKey);
      
      return result;
    } catch (error: any) {
      console.error('Trend submission error:', error);
      return {
        success: false,
        message: 'Failed to submit trend',
        error: error.message,
      };
    }
  }

  private async processSubmission(data: TrendSubmissionData): Promise<SubmissionResult> {
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
    const isDuplicate = await this.checkDuplicate(data.url, user.id);
    if (isDuplicate) {
      return {
        success: false,
        message: 'You have already submitted this trend',
        error: 'Duplicate submission',
      };
    }

    // Get user profile for tier calculation
    const { data: userProfile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Continue with default profile
    }

    // Extract metadata from URL
    const extractedData = await this.extractMetadata(data.url, data.platform);
    
    // Upload screenshot if provided
    let screenshotUrl = null;
    if (data.screenshot) {
      screenshotUrl = await this.uploadScreenshot(data.screenshot, user.id);
    }

    // Calculate quality score
    const qualityScore = this.calculateQualityScore({
      ...data,
      screenshot_url: screenshotUrl,
      ...extractedData,
    });

    // Prepare trend data
    const trendData = {
      user_id: user.id,
      url: data.url,
      title: data.title || extractedData.title || 'Untitled Trend',
      description: data.description || extractedData.description,
      category: this.mapToValidCategory(data.category || extractedData.category),
      platform: data.platform || extractedData.platform || 'unknown',
      screenshot_url: screenshotUrl,
      thumbnail_url: extractedData.thumbnail_url,
      demographics_data: data.demographics_data,
      creator_info: data.creator_info || extractedData.creator,
      hashtags: data.hashtags || extractedData.hashtags,
      caption: data.caption || extractedData.caption,
      metadata: {
        ...extractedData.metadata,
        ...data.metadata,
        view_count: extractedData.view_count,
        engagement_rate: extractedData.engagement_rate,
      },
      wave_score: qualityScore,
      quality_score: qualityScore,
      validation_status: 'pending',
      approve_count: 0,
      reject_count: 0,
    };

    // Calculate expected earnings
    const expectedEarnings = calculateTrendEarnings(
      trendData,
      {
        user_id: user.id,
        performance_tier: userProfile?.performance_tier || 'learning',
        quality_score: userProfile?.quality_score || 0.5,
        approval_rate: userProfile?.approval_rate || 0.5,
        trends_submitted: userProfile?.trends_submitted || 0,
        trends_approved: userProfile?.trends_approved || 0,
        current_balance: userProfile?.current_balance || 0,
        total_earned: userProfile?.total_earned || 0,
      }
    );

    // Submit to database (earnings will be calculated by trigger)
    const { data: trend, error: submitError } = await this.supabase
      .from('captured_trends')
      .insert([trendData])
      .select()
      .single();

    if (submitError) {
      console.error('Submission error:', submitError);
      return {
        success: false,
        message: 'Failed to save trend',
        error: submitError.message,
      };
    }

    // Return success with earnings breakdown
    return {
      success: true,
      trendId: trend.id,
      earnings: expectedEarnings.total,
      breakdown: expectedEarnings.breakdown,
      message: `Trend submitted! You earned ${formatEarnings(expectedEarnings.total)}`,
    };
  }

  /**
   * Check if URL has already been submitted by user
   */
  private async checkDuplicate(url: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('captured_trends')
      .select('id')
      .eq('url', url)
      .eq('user_id', userId)
      .limit(1);

    return !error && data && data.length > 0;
  }

  /**
   * Extract metadata from trend URL
   */
  private async extractMetadata(url: string, platform?: string): Promise<any> {
    try {
      // Determine platform from URL if not provided
      if (!platform) {
        if (url.includes('tiktok.com')) platform = 'tiktok';
        else if (url.includes('instagram.com')) platform = 'instagram';
        else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
        else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
        else if (url.includes('reddit.com')) platform = 'reddit';
      }

      // Call metadata extraction API
      const response = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, platform }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Metadata extraction error:', error);
    }

    // Return minimal data if extraction fails
    return {
      platform,
      title: null,
      description: null,
      thumbnail_url: null,
      view_count: 0,
      engagement_rate: 0,
      metadata: {},
    };
  }

  /**
   * Upload screenshot to storage
   */
  private async uploadScreenshot(file: File, userId: string): Promise<string | null> {
    try {
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await this.supabase.storage
        .from('trend-screenshots')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Screenshot upload error:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('trend-screenshots')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Screenshot upload error:', error);
      return null;
    }
  }

  /**
   * Calculate quality score for trend
   */
  private calculateQualityScore(data: any): number {
    let score = 50; // Base score

    // Content completeness (30 points)
    if (data.title && data.title.length > 10) score += 10;
    if (data.description && data.description.length > 20) score += 10;
    if (data.screenshot_url) score += 10;

    // Metadata richness (20 points)
    if (data.hashtags && data.hashtags.length >= 3) score += 10;
    if (data.creator_info) score += 5;
    if (data.demographics_data) score += 5;

    // Engagement indicators (20 points)
    const viewCount = data.metadata?.view_count || 0;
    if (viewCount > 1000000) score += 20;
    else if (viewCount > 100000) score += 15;
    else if (viewCount > 10000) score += 10;
    else if (viewCount > 1000) score += 5;

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Map user input to valid database category
   */
  private mapToValidCategory(input?: string): string {
    if (!input) return 'other';
    
    const categoryMap: Record<string, string> = {
      'humor': 'humor',
      'memes': 'humor',
      'funny': 'humor',
      'comedy': 'humor',
      'finance': 'finance',
      'crypto': 'crypto',
      'stocks': 'finance',
      'investing': 'finance',
      'tech': 'technology',
      'technology': 'technology',
      'ai': 'technology',
      'fashion': 'fashion',
      'style': 'fashion',
      'beauty': 'beauty',
      'makeup': 'beauty',
      'fitness': 'fitness',
      'health': 'fitness',
      'workout': 'fitness',
      'food': 'food',
      'cooking': 'food',
      'recipe': 'food',
      'travel': 'travel',
      'vacation': 'travel',
      'music': 'entertainment',
      'movies': 'entertainment',
      'entertainment': 'entertainment',
      'education': 'education',
      'learning': 'education',
      'tutorial': 'education',
    };

    const normalized = input.toLowerCase();
    return categoryMap[normalized] || 'other';
  }

  /**
   * Get user's submission history
   */
  async getUserSubmissions(userId: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('captured_trends')
      .select(`
        *,
        earnings_ledger!left(
          amount,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch submissions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get trending content for validation
   */
  async getTrendsForValidation(userId: string, limit: number = 10): Promise<any[]> {
    // Get trends user hasn't validated yet
    const { data, error } = await this.supabase
      .from('captured_trends')
      .select('*')
      .neq('user_id', userId) // Can't validate own trends
      .eq('validation_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch trends for validation:', error);
      return [];
    }

    // Filter out trends user has already validated
    const trendIds = data?.map(t => t.id) || [];
    if (trendIds.length === 0) return [];

    const { data: validations } = await this.supabase
      .from('trend_validations')
      .select('trend_id')
      .eq('user_id', userId)
      .in('trend_id', trendIds);

    const validatedIds = new Set(validations?.map(v => v.trend_id) || []);
    
    return data?.filter(t => !validatedIds.has(t.id)) || [];
  }
}

export default UnifiedTrendSubmissionService;