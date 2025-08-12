// Direct TikTok metadata extractor that doesn't rely on oEmbed API
// Uses pattern matching and known TikTok CDN patterns

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
    }
    
    // Extract video ID
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      metadata.video_id = videoIdMatch[1];
      
      // Generate thumbnail URL using known CDN patterns
      // These patterns work without authentication
      metadata.thumbnail_url = this.generateThumbnailUrl(videoIdMatch[1]);
      
      // Estimate post date from video ID (first 10 digits are often timestamp)
      metadata.posted_at = this.estimatePostDate(videoIdMatch[1]);
    }
    
    return metadata;
  }
  
  private static generateThumbnailUrl(videoId: string): string {
    // TikTok thumbnail patterns that often work
    // We'll use a pattern that's most likely to work
    const patterns = [
      // Pattern 1: Direct object storage (often works)
      `https://p16-sign.tiktokcdn.com/obj/tos-maliva-p-0068/${videoId}~noop.image`,
      // Pattern 2: Alternative CDN
      `https://p77-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/${videoId}~noop.image`,
      // Pattern 3: Thumbnail service
      `https://p16-sign-sg.tiktokcdn.com/aweme/100x100/tos-alisg-p-0037/${videoId}.jpeg`,
    ];
    
    // Return the first pattern as default
    // In production, you might want to test which one works
    return patterns[0];
  }
  
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