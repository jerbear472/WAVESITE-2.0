// Safe MetadataExtractor that doesn't rely on external APIs
interface PostMetadata {
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  thumbnail_url?: string;
  posted_at?: string;
}

export class MetadataExtractor {
  static async extractFromUrl(url: string): Promise<PostMetadata & { title?: string; description?: string }> {
    const platform = this.detectPlatform(url);
    
    // Just return basic data extracted from URL patterns
    // No external API calls that could fail
    const basicData = this.extractBasicDataFromUrl(url, platform);
    
    return {
      ...basicData.metadata,
      title: basicData.title,
      description: basicData.description
    };
  }
  
  private static detectPlatform(url: string): string {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    return 'other';
  }
  
  private static extractBasicDataFromUrl(url: string, platform: string): any {
    const metadata: PostMetadata = {};
    
    // Extract basic info from URL patterns
    switch (platform) {
      case 'tiktok': {
        const userMatch = url.match(/@([^\/\?]+)/);
        if (userMatch) {
          metadata.creator_handle = `@${userMatch[1]}`;
        }
        break;
      }
      
      case 'instagram': {
        const reelMatch = url.match(/\/reel\/([^\/\?]+)/);
        const postMatch = url.match(/\/p\/([^\/\?]+)/);
        if (reelMatch || postMatch) {
          // Basic Instagram data
        }
        break;
      }
      
      case 'youtube': {
        const videoMatch = url.match(/[?&]v=([^&]+)/);
        const shortMatch = url.match(/youtu\.be\/([^?]+)/);
        if (videoMatch || shortMatch) {
          // Basic YouTube data
        }
        break;
      }
      
      case 'twitter': {
        const tweetMatch = url.match(/status\/(\d+)/);
        if (tweetMatch) {
          // Basic Twitter data
        }
        break;
      }
    }
    
    return {
      platform,
      metadata,
      title: `${platform} content`,
      description: `Content from ${platform}`
    };
  }
  
  private static extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.substring(1));
  }
}