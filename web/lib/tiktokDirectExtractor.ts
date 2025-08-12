// Direct TikTok metadata extractor that doesn't rely on oEmbed API
// Uses pattern matching and fallback thumbnails

import { generateFallbackThumbnailServer } from './thumbnailFallback';

interface TikTokMetadata {
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  thumbnail_url?: string;
  video_id?: string;
  posted_at?: string;
}

export class TikTokDirectExtractor {
  static extract(url: string): TikTokMetadata {
    const metadata: TikTokMetadata = {};
    
    // Extract username
    const usernameMatch = url.match(/@([^\/\?]+)/);
    if (usernameMatch) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
      // Store for thumbnail generation
      this.lastExtractedUsername = usernameMatch[1];
    }
    
    // Extract video ID
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      metadata.video_id = videoIdMatch[1];
      
      // Generate fallback thumbnail with username
      metadata.thumbnail_url = this.generateThumbnailUrl(videoIdMatch[1]);
      
      // Estimate post date from video ID (first 10 digits are often timestamp)
      metadata.posted_at = this.estimatePostDate(videoIdMatch[1]);
    }
    
    return metadata;
  }
  
  private static generateThumbnailUrl(videoId: string): string {
    // Since direct CDN access is blocked, generate a fallback thumbnail
    // This will show a nice placeholder with TikTok branding
    const username = this.lastExtractedUsername || 'TikTok';
    return generateFallbackThumbnailServer('tiktok', username, videoId);
  }
  
  private static lastExtractedUsername?: string;
  
  private static estimatePostDate(videoId: string): string {
    try {
      // TikTok video IDs often start with a timestamp
      const timestamp = parseInt(videoId.substring(0, 10));
      if (!isNaN(timestamp) && timestamp > 1600000000) {
        return new Date(timestamp * 1000).toISOString();
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return new Date().toISOString();
  }
  
  // Generate a working thumbnail URL for display
  static getDisplayThumbnail(url: string): string | undefined {
    const metadata = this.extract(url);
    if (metadata.video_id) {
      // Use a simpler pattern that's more likely to work for display
      // This will be proxied through our image proxy to avoid CORS
      return `https://www.tiktok.com/api/img/?itemId=${metadata.video_id}&location=0&aid=1988`;
    }
    return metadata.thumbnail_url;
  }
}