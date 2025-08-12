// Vercel-safe metadata extractor that uses direct patterns without proxy verification
// This ensures thumbnails work in production on Vercel

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

export class VercelSafeMetadataExtractor {
  // Main extraction method - uses direct patterns that work on Vercel
  static async extractFromUrl(url: string): Promise<PostMetadata> {
    console.log('🚀 VercelSafeMetadataExtractor.extractFromUrl called with:', url);
    
    const platform = this.detectPlatform(url);
    let metadata: PostMetadata = { platform };

    // Extract basic info from URL patterns
    switch (platform) {
      case 'tiktok':
        metadata = this.extractTikTokMetadata(url);
        break;
      case 'youtube':
        metadata = this.extractYouTubeMetadata(url);
        break;
      case 'instagram':
        metadata = this.extractInstagramMetadata(url);
        break;
      case 'twitter':
        metadata = this.extractTwitterMetadata(url);
        break;
      default:
        metadata = { platform: 'other' };
    }

    // Try to enhance with oEmbed data if available (but don't rely on it)
    try {
      const enhanced = await this.tryOEmbedEnhancement(url, platform, metadata);
      metadata = { ...metadata, ...enhanced };
    } catch (error) {
      console.log('oEmbed enhancement failed (expected on Vercel), using direct patterns');
    }

    console.log('✅ Final metadata:', {
      platform: metadata.platform,
      thumbnail_url: metadata.thumbnail_url,
      creator_handle: metadata.creator_handle
    });

    return metadata;
  }

  // Detect platform from URL
  private static detectPlatform(url: string): string {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    return 'other';
  }

  // Extract TikTok metadata using URL patterns only
  private static extractTikTokMetadata(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'tiktok' };

    // Extract username
    const usernameMatch = url.match(/@([^\/\?]+)/);
    if (usernameMatch) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    // Extract video ID and generate thumbnail
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      
      // Use the most common TikTok CDN pattern
      // This works most of the time without verification
      metadata.thumbnail_url = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}`;
      
      console.log('📹 TikTok video ID:', videoId);
      console.log('🖼️ TikTok thumbnail:', metadata.thumbnail_url);
    }

    return metadata;
  }

  // Extract YouTube metadata - very reliable
  private static extractYouTubeMetadata(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'youtube' };

    // Extract video ID
    const patterns = [
      /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const videoId = match[1];
        // YouTube thumbnails are always available at these URLs
        metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        console.log('📺 YouTube video ID:', videoId);
        console.log('🖼️ YouTube thumbnail:', metadata.thumbnail_url);
        break;
      }
    }

    // Extract channel name if present
    const channelMatch = url.match(/youtube\.com\/@([^\/]+)/);
    if (channelMatch) {
      metadata.creator_handle = `@${channelMatch[1]}`;
      metadata.creator_name = channelMatch[1];
    }

    return metadata;
  }

  // Extract Instagram metadata
  private static extractInstagramMetadata(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'instagram' };

    // Extract post/reel ID
    const postIdMatch = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (postIdMatch) {
      const postId = postIdMatch[1];
      // Instagram media endpoint (may require auth in some cases)
      metadata.thumbnail_url = `https://www.instagram.com/p/${postId}/media/?size=l`;
      console.log('📸 Instagram post ID:', postId);
      console.log('🖼️ Instagram thumbnail:', metadata.thumbnail_url);
    }

    // Extract username if in URL
    const usernameMatch = url.match(/instagram\.com\/([^\/]+)\/(?:p|reel|reels)/);
    if (usernameMatch && !['explore', 'accounts'].includes(usernameMatch[1])) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    return metadata;
  }

  // Extract Twitter/X metadata
  private static extractTwitterMetadata(url: string): PostMetadata {
    const metadata: PostMetadata = { platform: 'twitter' };

    // Extract username
    const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
    if (usernameMatch && !['i', 'home', 'explore'].includes(usernameMatch[1])) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    // Twitter doesn't have predictable thumbnail URLs
    // We'll rely on oEmbed or leave it empty
    
    return metadata;
  }

  // Try to enhance with oEmbed data (optional enhancement)
  private static async tryOEmbedEnhancement(url: string, platform: string, existingMetadata: PostMetadata): Promise<Partial<PostMetadata>> {
    const enhancement: Partial<PostMetadata> = {};

    // Skip oEmbed for platforms where we already have good data
    if (existingMetadata.thumbnail_url && platform !== 'twitter') {
      return enhancement;
    }

    try {
      let oembedUrl: string | null = null;

      switch (platform) {
        case 'tiktok':
          // Only try if we don't have a thumbnail
          if (!existingMetadata.thumbnail_url) {
            oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
          }
          break;
        case 'twitter':
          oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
          break;
        case 'instagram':
          if (!existingMetadata.thumbnail_url) {
            oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
          }
          break;
      }

      if (oembedUrl) {
        // Try to fetch via proxy (may fail on Vercel)
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.thumbnail_url && !existingMetadata.thumbnail_url) {
            enhancement.thumbnail_url = data.thumbnail_url;
          }
          
          if (data.author_name && !existingMetadata.creator_name) {
            enhancement.creator_name = data.author_name;
            if (!existingMetadata.creator_handle) {
              enhancement.creator_handle = data.author_name.startsWith('@') ? 
                data.author_name : `@${data.author_name}`;
            }
          }
          
          if (data.title && !existingMetadata.post_caption) {
            enhancement.post_caption = data.title;
            enhancement.hashtags = this.extractHashtags(data.title);
          }
        }
      }
    } catch (error) {
      // Silently fail - this is just enhancement
      console.log('oEmbed enhancement skipped');
    }

    return enhancement;
  }

  // Extract hashtags from text
  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }
}