// Direct thumbnail extractor that uses known URL patterns
// Works without proxy for better reliability

export class DirectThumbnailExtractor {
  static extractThumbnail(url: string): string | null {
    if (!url) return null;
    
    // Clean the URL first
    url = url.trim();
    
    // YouTube - most reliable
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const patterns = [
        /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          const videoId = match[1];
          // Return high quality thumbnail directly
          const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          console.log('DirectExtractor: YouTube thumbnail:', thumbnail);
          return thumbnail;
        }
      }
    }
    
    // TikTok - try to extract video ID
    if (url.includes('tiktok.com')) {
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        // Use a pattern that often works
        const thumbnail = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-noop.image`;
        console.log('DirectExtractor: TikTok thumbnail (unverified):', thumbnail);
        return thumbnail;
      }
    }
    
    // Instagram - basic pattern
    if (url.includes('instagram.com')) {
      const postIdMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);
      if (postIdMatch && postIdMatch[1]) {
        const postId = postIdMatch[1];
        // Instagram media URL pattern
        const thumbnail = `https://www.instagram.com/p/${postId}/media/?size=l`;
        console.log('DirectExtractor: Instagram thumbnail (unverified):', thumbnail);
        return thumbnail;
      }
    }
    
    // Twitter/X - extract tweet ID
    if (url.includes('twitter.com') || url.includes('x.com')) {
      const tweetIdMatch = url.match(/status\/(\d+)/);
      if (tweetIdMatch && tweetIdMatch[1]) {
        // Twitter doesn't have predictable thumbnail URLs
        // Return null and let oEmbed handle it
        return null;
      }
    }
    
    // Reddit - extract post info
    if (url.includes('reddit.com')) {
      // Reddit thumbnails are complex, return null
      return null;
    }
    
    return null;
  }
  
  // Get a placeholder thumbnail based on platform
  static getPlaceholderThumbnail(url: string): string {
    if (url.includes('tiktok.com')) {
      return 'https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/default~tplv-noop.image';
    }
    if (url.includes('instagram.com')) {
      return 'https://www.instagram.com/static/images/web/mobile_nav_type_logo.png/735145cfe0a4.png';
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'https://img.youtube.com/vi/default/hqdefault.jpg';
    }
    // Generic placeholder
    return '/images/trend-placeholder.png';
  }
}