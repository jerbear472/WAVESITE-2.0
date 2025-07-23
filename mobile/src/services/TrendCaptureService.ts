import { Linking, Share } from 'react-native';
import { supabase } from '../config/supabase';
import PointsService from './PointsService';

export interface TrendMetadata {
  title: string;
  description: string;
  hashtags: string[];
  thumbnail?: string;
  author?: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | null;
  videoId?: string;
  creatorHandle?: string;
  caption?: string;
  likeCount?: number;
  viewCount?: number;
  commentCount?: number;
  shareCount?: number;
  saveCount?: number;
  contentType?: 'video' | 'image' | 'carousel' | 'story';
  durationSeconds?: number;
  postedAt?: string;
  music?: {
    title?: string;
    artist?: string;
    original?: boolean;
  };
}

export interface CapturedTrend {
  id: string;
  user_id: string;
  url: string;
  platform: string;
  title: string;
  description: string;
  hashtags: string;
  metadata: any;
  captured_at: string;
  is_trending?: boolean;
  engagement_score?: number;
  status?: string;
  validation_count?: number;
  positive_votes?: number;
  validated_at?: string;
  rejected_at?: string;
  creator_handle?: string;
  caption?: string;
  like_count?: number;
  view_count?: number;
  comment_count?: number;
  share_count?: number;
  save_count?: number;
  thumbnail_url?: string;
  content_type?: string;
  duration_seconds?: number;
  posted_at?: string;
  fetched_at?: string;
}

class TrendCaptureService {
  private static instance: TrendCaptureService;
  
  private constructor() {}
  
  static getInstance(): TrendCaptureService {
    if (!TrendCaptureService.instance) {
      TrendCaptureService.instance = new TrendCaptureService();
    }
    return TrendCaptureService.instance;
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): 'tiktok' | 'instagram' | 'youtube' | null {
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
      return 'tiktok';
    }
    if (url.includes('instagram.com') || url.includes('instagr.am')) {
      return 'instagram';
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    return null;
  }

  /**
   * Extract video/post ID from URL
   */
  extractContentId(url: string, platform: string): string | null {
    try {
      const urlObj = new URL(url);
      
      switch (platform) {
        case 'tiktok':
          // Extract from URLs like: https://www.tiktok.com/@username/video/1234567890
          const tiktokMatch = url.match(/video\/(\d+)/);
          return tiktokMatch ? tiktokMatch[1] : null;
          
        case 'instagram':
          // Extract from URLs like: https://www.instagram.com/reel/ABC123/
          const instaMatch = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
          return instaMatch ? instaMatch[2] : null;
          
        case 'youtube':
          // Extract from URLs like: https://www.youtube.com/watch?v=ABC123
          // or https://youtu.be/ABC123
          if (url.includes('youtu.be')) {
            const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
            return shortMatch ? shortMatch[1] : null;
          } else {
            const params = new URLSearchParams(urlObj.search);
            return params.get('v');
          }
          
        default:
          return null;
      }
    } catch (error) {
      console.error('Error extracting content ID:', error);
      return null;
    }
  }

  /**
   * Extract metadata from URL (would call backend API in production)
   */
  async extractMetadata(url: string): Promise<TrendMetadata> {
    const platform = this.detectPlatform(url);
    const contentId = platform ? this.extractContentId(url, platform) : null;
    
    // Try to extract more metadata from the URL itself
    const urlMetadata = this.parseUrlMetadata(url, platform);
    
    // In production, this would call your backend API that uses proper APIs
    // or scraping to get real metadata
    
    // Enhanced metadata with better defaults
    // In production, this would include real API data
    const mockEnhancements = this.getMockEnhancements(platform, contentId);
    
    return {
      title: urlMetadata.title || mockEnhancements.title || `${platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Social Media'} Trend`,
      description: urlMetadata.description || mockEnhancements.description || `Trending content from ${platform || 'social media'}`,
      hashtags: urlMetadata.hashtags || mockEnhancements.hashtags || ['trending', 'viral', platform || 'social'].filter(Boolean),
      platform,
      videoId: contentId || undefined,
      thumbnail: urlMetadata.thumbnail || this.generateThumbnailUrl(platform, contentId),
      author: urlMetadata.author || mockEnhancements.author || undefined,
    };
  }

  /**
   * Parse metadata from URL patterns
   */
  private parseUrlMetadata(url: string, platform: string | null): Partial<TrendMetadata> {
    const metadata: Partial<TrendMetadata> = {};
    
    try {
      if (platform === 'tiktok') {
        // Extract username from TikTok URL
        const usernameMatch = url.match(/@([^/]+)/);
        if (usernameMatch) {
          metadata.author = usernameMatch[1];
        }
      } else if (platform === 'instagram') {
        // Instagram URLs sometimes contain usernames
        const pathMatch = url.match(/instagram\.com\/([^/]+)\//);
        if (pathMatch && !['p', 'reel', 'tv'].includes(pathMatch[1])) {
          metadata.author = pathMatch[1];
        }
      } else if (platform === 'youtube') {
        // YouTube doesn't expose username in URL easily
        // Would need API call
      }
    } catch (error) {
      console.error('Error parsing URL metadata:', error);
    }
    
    return metadata;
  }

  /**
   * Generate thumbnail URL based on platform and content ID
   */
  private generateThumbnailUrl(platform: string | null, contentId: string | null): string | undefined {
    if (!platform || !contentId) return undefined;
    
    switch (platform) {
      case 'youtube':
        // YouTube thumbnails are predictable
        return `https://img.youtube.com/vi/${contentId}/maxresdefault.jpg`;
      case 'tiktok':
      case 'instagram':
        // These platforms require API access or scraping
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Get mock enhancements for demo purposes
   */
  private getMockEnhancements(platform: string | null, contentId: string | null): Partial<TrendMetadata> {
    if (!platform) return {};
    
    // Generate realistic mock engagement numbers
    const baseViews = Math.floor(Math.random() * 900000) + 100000; // 100K - 1M
    const engagementRate = Math.random() * 0.15 + 0.05; // 5-20% engagement
    
    const mockData = {
      tiktok: {
        title: 'Viral Dance Challenge',
        description: 'New trending dance move taking over FYP',
        hashtags: ['dancechallenge', 'viral', 'fyp', 'trending'],
        author: contentId ? 'creator' + contentId.slice(0, 4) : 'trendspotter',
        creatorHandle: contentId ? '@creator' + contentId.slice(0, 4) : '@trendspotter',
        caption: '🔥 New dance alert! Can you do this move? #dancechallenge #viral #fyp',
        viewCount: baseViews,
        likeCount: Math.floor(baseViews * engagementRate),
        commentCount: Math.floor(baseViews * engagementRate * 0.1),
        shareCount: Math.floor(baseViews * engagementRate * 0.05),
        saveCount: Math.floor(baseViews * engagementRate * 0.03),
        contentType: 'video',
        durationSeconds: Math.floor(Math.random() * 45) + 15, // 15-60 seconds
        postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Within last week
        music: {
          title: 'Original Sound',
          artist: 'trendspotter',
          original: true
        }
      },
      instagram: {
        title: 'Aesthetic Photo Trend',
        description: 'Minimalist photography style going viral',
        hashtags: ['aesthetic', 'photography', 'reels', 'explore'],
        author: contentId ? 'insta' + contentId.slice(0, 4) : 'photographer',
        creatorHandle: contentId ? '@insta' + contentId.slice(0, 4) : '@photographer',
        caption: 'Minimal vibes only ✨ Which one is your favorite? 📸 #aesthetic #photography',
        viewCount: baseViews,
        likeCount: Math.floor(baseViews * engagementRate * 1.2), // Instagram typically has higher like rates
        commentCount: Math.floor(baseViews * engagementRate * 0.08),
        shareCount: Math.floor(baseViews * engagementRate * 0.04),
        saveCount: Math.floor(baseViews * engagementRate * 0.06),
        contentType: Math.random() > 0.5 ? 'carousel' : 'image',
        postedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(), // Within last 2 weeks
      },
      youtube: {
        title: 'Must-Watch Video',
        description: 'Breaking content everyone is talking about',
        hashtags: ['youtube', 'viral', 'mustwatch', 'trending'],
        author: contentId ? 'creator' + contentId.slice(0, 4) : 'youtuber',
        creatorHandle: contentId ? '@creator' + contentId.slice(0, 4) : '@youtuber',
        caption: 'You won\'t believe what happens next... 😱',
        viewCount: baseViews * 2, // YouTube typically shows higher view counts
        likeCount: Math.floor(baseViews * 2 * engagementRate * 0.5),
        commentCount: Math.floor(baseViews * 2 * engagementRate * 0.02),
        shareCount: Math.floor(baseViews * 2 * engagementRate * 0.01),
        contentType: 'video',
        durationSeconds: Math.floor(Math.random() * 600) + 120, // 2-12 minutes
        postedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Within last month
      },
    };
    
    return mockData[platform as keyof typeof mockData] || {};
  }

  /**
   * Capture a trend from a shared link
   */
  async captureTrend(
    url: string,
    userId: string,
    additionalData?: {
      title?: string;
      description?: string;
      hashtags?: string;
    },
    captureMethod: 'manual' | 'share_extension' = 'manual'
  ): Promise<CapturedTrend> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }
      
      const metadata = await this.extractMetadata(url);
      
      // Clean and process hashtags
      const processedHashtags = this.processHashtags(
        additionalData?.hashtags || metadata.hashtags.join(' ')
      );
      
      const trendData = {
        user_id: userId,
        url: this.normalizeUrl(url),
        platform: metadata.platform || 'unknown',
        title: additionalData?.title?.trim() || metadata.title,
        description: additionalData?.description?.trim() || metadata.description,
        hashtags: processedHashtags,
        creator_handle: metadata.creatorHandle || metadata.author,
        caption: metadata.caption || additionalData?.description?.trim() || metadata.description,
        like_count: metadata.likeCount || 0,
        view_count: metadata.viewCount || 0,
        comment_count: metadata.commentCount || 0,
        share_count: metadata.shareCount || 0,
        save_count: metadata.saveCount || 0,
        thumbnail_url: metadata.thumbnail,
        content_type: metadata.contentType || 'video',
        duration_seconds: metadata.durationSeconds,
        posted_at: metadata.postedAt,
        metadata: {
          ...metadata,
          captured_via: captureMethod,
          captured_at: new Date().toISOString(),
          original_url: url,
          content_id: metadata.videoId,
          author: metadata.author,
          thumbnail: metadata.thumbnail,
          music: metadata.music,
        },
        captured_at: new Date().toISOString(),
        is_trending: false,
        engagement_score: this.calculateEngagementScore(metadata),
        status: 'pending_validation',
        validation_count: 0,
        positive_votes: 0,
        fetched_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('captured_trends')
        .insert(trendData)
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('This trend has already been captured');
        }
        throw error;
      }
      
      // Award points for flagging a trend
      try {
        await PointsService.awardPoints(userId, 'flag_trend', {
          trend_id: data.id,
          platform: data.platform,
        });
        
        // Update user's daily streak
        await PointsService.updateUserStreak(userId);
      } catch (pointsError) {
        console.error('Error awarding points:', pointsError);
        // Don't fail the trend capture if points fail
      }
      
      return data;
    } catch (error) {
      console.error('Error capturing trend:', error);
      throw error;
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL (remove tracking parameters, etc.)
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Process and clean hashtags
   */
  private processHashtags(hashtags: string): string {
    if (!hashtags) return '';
    
    // Extract hashtags and clean them
    const hashtagArray = hashtags
      .split(/[\s,]+/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
      .map(tag => tag.toLowerCase())
      .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates
    
    return hashtagArray.slice(0, 10).join(' '); // Limit to 10 hashtags
  }

  /**
   * Calculate engagement score based on metrics
   */
  private calculateEngagementScore(metadata: TrendMetadata): number {
    const views = metadata.viewCount || 0;
    const likes = metadata.likeCount || 0;
    const comments = metadata.commentCount || 0;
    const shares = metadata.shareCount || 0;
    const saves = metadata.saveCount || 0;
    
    if (views === 0) return 0;
    
    // Weighted engagement rate calculation
    const engagementRate = (
      (likes * 1.0) +
      (comments * 2.0) +
      (shares * 3.0) +
      (saves * 2.5)
    ) / views;
    
    // Normalize to 0-100 scale
    const score = Math.min(100, Math.round(engagementRate * 1000));
    
    return score;
  }

  /**
   * Get user's captured trends
   */
  async getUserTrends(userId: string, limit = 10): Promise<CapturedTrend[]> {
    try {
      const { data, error } = await supabase
        .from('captured_trends')
        .select('*')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' && error.message?.includes('does not exist')) {
          console.warn('captured_trends table does not exist. Please run the database setup.');
          // Return empty array instead of throwing
          return [];
        }
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user trends:', error);
      return [];
    }
  }

  /**
   * Share app for capturing trends
   */
  async shareApp() {
    try {
      await Share.share({
        message: 'Check out WaveSight - Capture and analyze trending content!',
        title: 'Share WaveSight',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  }

  /**
   * Open original content in app or browser
   */
  async openOriginalContent(url: string) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  }
}

export default TrendCaptureService.getInstance();