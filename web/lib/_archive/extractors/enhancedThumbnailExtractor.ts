// Enhanced thumbnail extractor with multiple fallback strategies
// Ensures we always get a thumbnail when possible

import { TikTokThumbnailExtractor } from './tiktokThumbnailExtractor';

interface ThumbnailResult {
  thumbnail_url?: string;
  source: 'oembed' | 'direct' | 'api' | 'pattern' | 'fallback' | 'none';
  confidence: 'high' | 'medium' | 'low';
}

export class EnhancedThumbnailExtractor {
  // Multiple strategies for getting thumbnails
  
  static async getThumbnail(url: string, platform?: string): Promise<ThumbnailResult> {
    const detectedPlatform = platform || this.detectPlatform(url);
    
    switch (detectedPlatform) {
      case 'tiktok':
        return this.getTikTokThumbnail(url);
      case 'instagram':
        return this.getInstagramThumbnail(url);
      case 'youtube':
        return this.getYouTubeThumbnail(url);
      case 'twitter':
        return this.getTwitterThumbnail(url);
      default:
        return { source: 'none', confidence: 'low' };
    }
  }
  
  private static detectPlatform(url: string): string {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    return 'other';
  }
  
  private static async getTikTokThumbnail(url: string): Promise<ThumbnailResult> {
    // Use the specialized TikTok extractor
    try {
      const thumbnail = await TikTokThumbnailExtractor.extract(url);
      
      if (thumbnail) {
        // Determine confidence based on whether it came from oEmbed or pattern matching
        const isOembed = thumbnail.includes('tiktokcdn-us') || thumbnail.includes('image_url');
        
        return {
          thumbnail_url: thumbnail,
          source: isOembed ? 'oembed' : 'pattern',
          confidence: isOembed ? 'high' : 'medium'
        };
      }
    } catch (error) {
      console.log('TikTok extraction failed:', error);
    }
    
    // Fallback: Try quick extraction without verification
    const quickThumbnail = TikTokThumbnailExtractor.extractQuick(url);
    if (quickThumbnail) {
      return {
        thumbnail_url: quickThumbnail,
        source: 'pattern',
        confidence: 'low'
      };
    }
    
    return { source: 'none', confidence: 'low' };
  }
  
  private static async getInstagramThumbnail(url: string): Promise<ThumbnailResult> {
    // Instagram is tricky without API access
    // Strategy 1: Try oEmbed
    try {
      const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.thumbnail_url) {
          console.log('Instagram thumbnail from oEmbed:', data.thumbnail_url);
          return {
            thumbnail_url: data.thumbnail_url,
            source: 'oembed',
            confidence: 'high'
          };
        }
      }
    } catch (error) {
      console.log('Instagram oEmbed failed');
    }
    
    // Strategy 2: Extract post ID and try direct media URL
    const postIdMatch = url.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
    if (postIdMatch) {
      const postId = postIdMatch[2];
      // Instagram media URLs (these patterns sometimes work)
      const mediaUrl = `https://www.instagram.com/p/${postId}/media/?size=l`;
      
      console.log('Instagram thumbnail using media URL pattern');
      return {
        thumbnail_url: mediaUrl,
        source: 'pattern',
        confidence: 'low'
      };
    }
    
    return { source: 'none', confidence: 'low' };
  }
  
  private static async getYouTubeThumbnail(url: string): Promise<ThumbnailResult> {
    // YouTube is the easiest - reliable thumbnail URLs
    const patterns = [
      /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    let videoId = null;
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }
    
    if (videoId) {
      // YouTube provides multiple quality thumbnails
      const thumbnails = [
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Best quality
        `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,    // Standard quality
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,    // High quality
        `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,    // Medium quality
        `https://img.youtube.com/vi/${videoId}/default.jpg`       // Default
      ];
      
      // Try to find the best available thumbnail
      for (const thumbnail of thumbnails) {
        try {
          const response = await fetch(`/api/proxy?url=${encodeURIComponent(thumbnail)}`, {
            method: 'HEAD'
          }).catch(() => null);
          
          if (response && response.ok) {
            console.log('YouTube thumbnail found:', thumbnail);
            return {
              thumbnail_url: thumbnail,
              source: 'direct',
              confidence: 'high'
            };
          }
        } catch {
          // Continue to next quality
        }
      }
      
      // Default to medium quality even if we can't verify
      console.log('YouTube thumbnail using default pattern');
      return {
        thumbnail_url: thumbnails[2],
        source: 'pattern',
        confidence: 'medium'
      };
    }
    
    return { source: 'none', confidence: 'low' };
  }
  
  private static async getTwitterThumbnail(url: string): Promise<ThumbnailResult> {
    // Twitter/X thumbnail extraction
    try {
      // Try oEmbed first
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        // Parse HTML to find image
        const imageMatch = data.html?.match(/<img[^>]+src="([^"]+)"/);
        if (imageMatch) {
          console.log('Twitter thumbnail from oEmbed HTML');
          return {
            thumbnail_url: imageMatch[1],
            source: 'oembed',
            confidence: 'medium'
          };
        }
      }
    } catch (error) {
      console.log('Twitter oEmbed failed');
    }
    
    // Twitter doesn't provide easy thumbnail access
    return { source: 'none', confidence: 'low' };
  }
  
  // Fallback method using screenshot service
  static async getScreenshotFallback(url: string): Promise<ThumbnailResult> {
    // Could integrate with a screenshot service like:
    // - https://screenshotapi.net/
    // - https://www.screenshotmachine.com/
    // - Custom puppeteer endpoint
    
    // For now, return none
    return { source: 'none', confidence: 'low' };
  }
}