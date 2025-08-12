// Simple TikTok thumbnail generator
// Generates thumbnail URLs that work when loaded in the browser

export class SimpleTiktokThumbnail {
  static generateThumbnailUrl(tiktokUrl: string): string | null {
    // Extract video ID from various TikTok URL formats
    const patterns = [
      /video\/(\d+)/,           // Standard format
      /\/v\/(\d+)/,             // Short format
      /item\/(\d+)/,            // Alternative format
    ];
    
    for (const pattern of patterns) {
      const match = tiktokUrl.match(pattern);
      if (match && match[1]) {
        const videoId = match[1];
        
        // Generate a thumbnail URL that works in browsers
        // This uses TikTok's web player thumbnail endpoint
        const thumbnailUrl = `https://www.tiktok.com/oembed/thumbnail/${videoId}`;
        
        console.log('🎯 [SimpleTiktok] Video ID:', videoId);
        console.log('🖼️ [SimpleTiktok] Generated thumbnail:', thumbnailUrl);
        
        return thumbnailUrl;
      }
    }
    
    // If no video ID found, try to extract from short URL
    const shortMatch = tiktokUrl.match(/\/t\/([A-Za-z0-9]+)/);
    if (shortMatch) {
      // For short URLs, we can't generate a direct thumbnail
      // Return a placeholder or null
      console.log('📱 [SimpleTiktok] Short URL detected, cannot generate thumbnail');
      return null;
    }
    
    console.log('⚠️ [SimpleTiktok] Could not extract video ID from:', tiktokUrl);
    return null;
  }
  
  static async extractWithFallback(url: string): Promise<any> {
    const metadata: any = { platform: 'tiktok' };
    
    // Extract username
    const usernameMatch = url.match(/@([^\/\?]+)/);
    if (usernameMatch) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }
    
    // Try to generate thumbnail
    const thumbnailUrl = this.generateThumbnailUrl(url);
    
    if (thumbnailUrl) {
      metadata.thumbnail_url = thumbnailUrl;
    } else {
      // Fallback: Use video ID to create a CDN URL that might work
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch) {
        // Use multiple CDN patterns as fallback
        // These might work depending on region and time
        metadata.thumbnail_url = `https://p16-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/${videoIdMatch[1]}~tplv-photomode-image.jpeg`;
        metadata.fallback_thumbnails = [
          `https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/${videoIdMatch[1]}~noop.image`,
          `https://p77-sign-sg.tiktokcdn.com/${videoIdMatch[1]}~tplv-obj.image`,
          `https://www.tiktok.com/api/img/?itemId=${videoIdMatch[1]}`,
        ];
      }
    }
    
    return metadata;
  }
}