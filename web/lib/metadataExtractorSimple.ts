// Simplified metadata extractor with direct thumbnail generation
// This doesn't rely on oEmbed APIs which can be unreliable

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
  platform?: string;
}

export class SimpleMetadataExtractor {
  static extractFromUrl(url: string): PostMetadata {
    const platform = this.detectPlatform(url);
    const metadata: PostMetadata = { platform };

    switch (platform) {
      case 'tiktok':
        return this.extractTikTokData(url);
      case 'instagram':
        return this.extractInstagramData(url);
      case 'youtube':
        return this.extractYouTubeData(url);
      case 'twitter':
        return this.extractTwitterData(url);
      default:
        return metadata;
    }
  }

  private static detectPlatform(url: string): string {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'other';
  }

  private static extractTikTokData(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'tiktok' };
    
    // Extract username
    const usernameMatch = url.match(/@([^\/\?]+)/);
    if (usernameMatch) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    // Extract video ID for thumbnail
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      // TikTok thumbnail patterns that often work
      metadata.thumbnail_url = `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037/~tplv-dmt-logom:tos-alisg-i-0000/${videoId}~tplv-noop.image`;
    }

    return metadata;
  }

  private static extractInstagramData(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'instagram' };
    
    // Extract username from URL patterns like /p/CODE/ or /reel/CODE/
    const patterns = [
      /instagram\.com\/([^\/]+)\/p\//,
      /instagram\.com\/([^\/]+)\/reel\//,
      /instagram\.com\/([^\/]+)\//
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] !== 'p' && match[1] !== 'reel') {
        metadata.creator_handle = `@${match[1]}`;
        metadata.creator_name = match[1];
        break;
      }
    }

    // Instagram doesn't provide easy thumbnail access without API
    // Could potentially use a service like instadp or picuki
    
    return metadata;
  }

  private static extractYouTubeData(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'youtube' };
    
    // Extract video ID
    const patterns = [
      /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const videoId = match[1];
        // YouTube provides reliable thumbnail URLs
        metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        break;
      }
    }

    // Extract channel name from URL if present
    const channelMatch = url.match(/\/channel\/([^\/\?]+)|\/c\/([^\/\?]+)|\/user\/([^\/\?]+)|@([^\/\?]+)/);
    if (channelMatch) {
      const channel = channelMatch[1] || channelMatch[2] || channelMatch[3] || channelMatch[4];
      metadata.creator_handle = channel.startsWith('@') ? channel : `@${channel}`;
      metadata.creator_name = channel.replace('@', '');
    }

    return metadata;
  }

  private static extractTwitterData(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'twitter' };
    
    // Extract username
    const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
    if (usernameMatch && usernameMatch[1] !== 'i' && usernameMatch[1] !== 'home') {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    // Twitter doesn't provide easy thumbnail access
    // Would need to use Twitter API or scraping
    
    return metadata;
  }
}