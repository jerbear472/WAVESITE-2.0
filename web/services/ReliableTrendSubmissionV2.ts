import { supabase } from '@/lib/supabase';
import { SUSTAINABLE_EARNINGS, calculateTrendEarnings } from '@/lib/SUSTAINABLE_EARNINGS';

interface SubmitTrendData {
  category: string;
  description: string;
  url?: string;
  screenshot?: File | string;
  platform?: string;
  evidence?: any;
  hashtags?: string[];
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
}

interface SubmitTrendResponse {
  success: boolean;
  data?: any;
  error?: string;
  retryable?: boolean;
}

export class ReliableTrendSubmissionV2 {
  private static instance: ReliableTrendSubmissionV2;
  private submissionQueue: Map<string, boolean> = new Map();
  private retryAttempts = 3;
  private retryDelay = 1000; // Start with 1 second

  private constructor() {}

  static getInstance(): ReliableTrendSubmissionV2 {
    if (!this.instance) {
      this.instance = new ReliableTrendSubmissionV2();
    }
    return this.instance;
  }

  async submitTrend(data: SubmitTrendData, userId: string): Promise<SubmitTrendResponse> {
    const submissionKey = `${userId}-${Date.now()}`;
    
    // Prevent duplicate submissions
    if (this.submissionQueue.has(userId)) {
      return {
        success: false,
        error: 'A submission is already in progress. Please wait.',
        retryable: false
      };
    }

    this.submissionQueue.set(userId, true);

    try {
      // Validate input
      const validation = this.validateInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          retryable: false
        };
      }

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return {
          success: false,
          error: 'Authentication required. Please log in.',
          retryable: false
        };
      }

      // Get user profile for tier calculation
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('spotter_tier, current_streak')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Continue with defaults if profile fetch fails
      }

      // Calculate earnings
      const earnings = calculateTrendEarnings({
        hasScreenshot: !!data.screenshot,
        hasCompleteInfo: !!(data.description && data.description.length > 20),
        hasDemographics: false, // Will be added from form later
        hasCreatorInfo: !!data.creator_handle,
        hasRichHashtags: (data.hashtags?.length || 0) >= 3,
        hasCaption: !!data.post_caption,
        hasMultiplePlatforms: false,
        viewCount: data.views_count || 0,
        engagementRate: this.calculateEngagementRate(data),
        waveScore: 50, // Default, will be calculated server-side
        isFinanceTrend: this.isFinanceTrend(data.description),
        spotterTier: profile?.spotter_tier || 'learning',
        streakDays: profile?.current_streak || 0
      });

      // Handle image upload if needed
      let screenshotUrl = null;
      if (data.screenshot instanceof File) {
        const uploadResult = await this.uploadImage(data.screenshot, userId);
        if (uploadResult.success) {
          screenshotUrl = uploadResult.url;
        }
      } else if (typeof data.screenshot === 'string') {
        screenshotUrl = data.screenshot;
      }

      // Prepare submission data
      const submissionData = {
        spotter_id: userId,
        category: this.mapCategory(data.category),
        description: data.description || '',
        screenshot_url: screenshotUrl,
        platform: data.platform || 'other',
        post_url: data.url,
        evidence: {
          ...data.evidence,
          url: data.url,
          metadata_captured: true
        },
        // Social media data
        creator_handle: data.creator_handle,
        creator_name: data.creator_name,
        post_caption: data.post_caption,
        hashtags: data.hashtags || [],
        likes_count: data.likes_count || 0,
        comments_count: data.comments_count || 0,
        shares_count: data.shares_count || 0,
        views_count: data.views_count || 0,
        // Earnings data
        base_amount: earnings.baseAmount,
        bonus_amount: earnings.bonusAmount,
        total_earned: earnings.totalAmount,
        tier_multiplier: earnings.tierMultiplier,
        // Status
        status: 'submitted',
        validation_count: 0,
        approve_count: 0,
        reject_count: 0,
        quality_score: 0.5,
        virality_prediction: 5
      };

      // Submit with retry logic
      const result = await this.submitWithRetry(submissionData);
      
      if (result.success) {
        // Update local user earnings optimistically
        await this.updateLocalEarnings(userId, earnings.totalAmount);
      }

      return result;

    } catch (error: any) {
      console.error('Submission error:', error);
      return {
        success: false,
        error: this.getUserFriendlyError(error),
        retryable: this.isRetryableError(error)
      };
    } finally {
      this.submissionQueue.delete(userId);
    }
  }

  private async submitWithRetry(data: any, attempt = 1): Promise<SubmitTrendResponse> {
    try {
      const { data: result, error } = await supabase
        .from('trend_submissions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      if (attempt < this.retryAttempts && this.isRetryableError(error)) {
        console.log(`Retry attempt ${attempt} after ${this.retryDelay}ms`);
        await this.delay(this.retryDelay * attempt);
        return this.submitWithRetry(data, attempt + 1);
      }
      throw error;
    }
  }

  private async uploadImage(file: File, userId: string): Promise<{ success: boolean; url?: string }> {
    try {
      // Validate file
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Image file too large (max 10MB)');
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid image type');
      }

      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('trend-images')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trend-images')
        .getPublicUrl(filename);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Image upload failed:', error);
      return { success: false };
    }
  }

  private validateInput(data: SubmitTrendData): { valid: boolean; error?: string } {
    if (!data.category) {
      return { valid: false, error: 'Please select a category' };
    }
    if (!data.description || data.description.trim().length < 10) {
      return { valid: false, error: 'Please provide a meaningful description (at least 10 characters)' };
    }
    if (data.description.length > 500) {
      return { valid: false, error: 'Description too long (max 500 characters)' };
    }
    return { valid: true };
  }

  private mapCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'Visual Style': 'visual_style',
      'Audio/Music': 'audio_music',
      'Creator Technique': 'creator_technique',
      'Meme Format': 'meme_format',
      'Product/Brand': 'product_brand',
      'Behavior Pattern': 'behavior_pattern'
    };
    return categoryMap[category] || category.toLowerCase().replace(/\s+/g, '_');
  }

  private calculateEngagementRate(data: SubmitTrendData): number {
    const views = data.views_count || 0;
    if (views === 0) return 0;
    
    const engagements = (data.likes_count || 0) + 
                       (data.comments_count || 0) + 
                       (data.shares_count || 0);
    
    return Math.min((engagements / views) * 100, 100);
  }

  private isFinanceTrend(description: string): boolean {
    const financeKeywords = [
      'crypto', 'bitcoin', 'ethereum', 'nft', 'defi', 'trading',
      'stocks', 'investment', 'finance', 'money', 'wealth', 'market'
    ];
    const lowerDesc = description.toLowerCase();
    return financeKeywords.some(keyword => lowerDesc.includes(keyword));
  }

  private async updateLocalEarnings(userId: string, amount: number): Promise<void> {
    try {
      // Update user profile earnings
      const { error } = await supabase.rpc('increment_user_earnings', {
        p_user_id: userId,
        p_amount: amount
      });
      
      if (error) {
        console.error('Failed to update earnings:', error);
      }
    } catch (error) {
      console.error('Earnings update error:', error);
    }
  }

  private isRetryableError(error: any): boolean {
    const message = error.message || '';
    const retryablePatterns = [
      'network',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'fetch failed',
      '503',
      '502',
      '504'
    ];
    return retryablePatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private getUserFriendlyError(error: any): string {
    const message = error.message || '';
    
    if (message.includes('duplicate')) {
      return 'This trend appears to have been submitted already.';
    }
    if (message.includes('category')) {
      return 'Please select a valid category for this trend.';
    }
    if (message.includes('auth')) {
      return 'Authentication error. Please log in again.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    return 'Failed to submit trend. Please try again or contact support if the issue persists.';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to check submission health
  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Test database connection
      const { error: dbError } = await supabase
        .from('trend_submissions')
        .select('id')
        .limit(1);
      
      if (dbError) {
        return { healthy: false, message: 'Database connection issue' };
      }

      // Test auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { healthy: false, message: 'Authentication issue' };
      }

      // Test storage bucket
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      if (storageError) {
        return { healthy: false, message: 'Storage service issue' };
      }

      return { healthy: true, message: 'All systems operational' };
    } catch (error) {
      return { healthy: false, message: 'Health check failed' };
    }
  }
}