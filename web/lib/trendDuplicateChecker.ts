import { supabase } from './supabase';

export class TrendDuplicateChecker {
  static async checkDuplicateUrl(url: string, userId?: string): Promise<{
    isDuplicate: boolean;
    existingTrend?: any;
    message?: string;
  }> {
    try {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);
      
      // Check for exact URL match
      const { data: exactMatch, error } = await supabase
        .from('trend_submissions')
        .select('id, spotter_id, created_at, status, category, description')
        .eq('post_url', url)
        .limit(1);

      if (error) {
        console.error('Error checking duplicate:', error);
        return { isDuplicate: false };
      }

      if (exactMatch && exactMatch.length > 0) {
        const trend = exactMatch[0];
        
        // If the same user submitted it
        if (userId && trend.spotter_id === userId) {
          return {
            isDuplicate: true,
            existingTrend: trend,
            message: 'You have already submitted this trend. Would you like to view it?'
          };
        }
        
        // If another user submitted it
        return {
          isDuplicate: true,
          existingTrend: trend,
          message: 'This trend has already been spotted by another user. Consider finding a different example of this trend.'
        };
      }

      // Check for similar URLs (same video ID for platforms)
      const videoId = this.extractVideoId(url);
      if (videoId) {
        const { data: similarMatch } = await supabase
          .from('trend_submissions')
          .select('id, post_url, created_at')
          .ilike('post_url', `%${videoId}%`)
          .limit(1);

        if (similarMatch && similarMatch.length > 0) {
          return {
            isDuplicate: true,
            existingTrend: similarMatch[0],
            message: 'A similar version of this content has already been submitted.'
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error in duplicate check:', error);
      return { isDuplicate: false };
    }
  }

  private static normalizeUrl(url: string): string {
    // Remove tracking parameters and normalize URL
    try {
      const urlObj = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 's', 'ref'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      
      // Normalize TikTok URLs
      if (url.includes('tiktok.com')) {
        // Convert vm.tiktok.com to www.tiktok.com
        urlObj.hostname = 'www.tiktok.com';
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private static extractVideoId(url: string): string | null {
    // TikTok
    const tiktokMatch = url.match(/video\/(\d+)/);
    if (tiktokMatch) return tiktokMatch[1];
    
    // YouTube
    const youtubeMatch = url.match(/(?:v=|\/v\/|youtu\.be\/|embed\/|watch\?v=)([^&\n?#]+)/);
    if (youtubeMatch) return youtubeMatch[1];
    
    // Instagram
    const instagramMatch = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (instagramMatch) return instagramMatch[1];
    
    // Twitter/X
    const twitterMatch = url.match(/status\/(\d+)/);
    if (twitterMatch) return twitterMatch[1];
    
    return null;
  }
}