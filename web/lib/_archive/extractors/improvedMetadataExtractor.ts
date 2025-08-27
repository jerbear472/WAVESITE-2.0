// Improved metadata extractor with better thumbnail extraction
// Handles TikTok, Instagram, YouTube, and Twitter/X

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

export class ImprovedMetadataExtractor {
  // Extract metadata from URL with improved thumbnail extraction
  static async extractFromUrl(url: string): Promise<PostMetadata> {
    console.log('🎯 ImprovedMetadataExtractor.extractFromUrl called with:', url);
    const platform = this.detectPlatform(url);
    let metadata: PostMetadata = { platform };

    try {
      switch (platform) {
        case 'tiktok':
          metadata = await this.extractTikTokMetadata(url);
          break;
        case 'instagram':
          metadata = await this.extractInstagramMetadata(url);
          break;
        case 'youtube':
          metadata = await this.extractYouTubeMetadata(url);
          break;
        case 'twitter':
          metadata = await this.extractTwitterMetadata(url);
          break;
        default:
          metadata = { platform: 'other' };
      }
    } catch (error) {
      console.error('Metadata extraction error:', error);
      // Return basic metadata even on error
      metadata = { ...metadata, platform };
    }

    // Always ensure we have a thumbnail URL
    if (!metadata.thumbnail_url) {
      console.log('⚠️ No thumbnail from primary extraction, trying fallback');
      const fallbackThumbnail = this.getFallbackThumbnail(url, platform);
      metadata.thumbnail_url = fallbackThumbnail || undefined;
    }

    console.log('✅ Final metadata with thumbnail:', {
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

  // Extract TikTok metadata with improved thumbnail extraction
  private static async extractTikTokMetadata(url: string): Promise<PostMetadata> {
    console.log('🎵 Extracting TikTok metadata from:', url);
    const metadata: PostMetadata = { platform: 'tiktok' };

    // Extract username from URL
    const usernameMatch = url.match(/@([^\/\?]+)/);
    if (usernameMatch) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    // Extract video ID for thumbnail
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      console.log('📹 TikTok video ID extracted:', videoId);
      
      // TikTok thumbnail patterns that work as of Jan 2025
      const thumbnailPatterns = [
        `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037/${videoId}~tplv-dmt-logom:tos-alisg-i-0000/${videoId}.image`,
        `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}`,
        `https://p16-sign.tiktokcdn.com/${videoId}~c5_720x720.jpeg`,
        `https://p77-sign-sg.tiktokcdn.com/${videoId}~tplv-obj.image`,
        `https://p16-pu-sign-sg.tiktokcdn.com/${videoId}~c5_720x720.jpeg`
      ];

      // Try oEmbed API first (most reliable when it works)
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        console.log('🔗 Trying TikTok oEmbed:', oembedUrl);
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail_url) {
            metadata.thumbnail_url = data.thumbnail_url;
            console.log('✅ Got TikTok thumbnail from oEmbed:', metadata.thumbnail_url);
          } else {
            console.log('⚠️ oEmbed response ok but no thumbnail_url');
          }
          
          // Extract other metadata from oEmbed
          if (data.author_name) {
            metadata.creator_name = data.author_name;
            if (!metadata.creator_handle) {
              metadata.creator_handle = data.author_name.startsWith('@') ? data.author_name : `@${data.author_name}`;
            }
          }
          
          if (data.title) {
            metadata.post_caption = data.title;
            metadata.hashtags = this.extractHashtags(data.title);
          }
        }
      } catch (error) {
        console.log('TikTok oEmbed failed, trying direct patterns');
      }

      // If oEmbed didn't work, use direct pattern
      if (!metadata.thumbnail_url) {
        // Use the most reliable pattern
        metadata.thumbnail_url = thumbnailPatterns[0];
        console.log('📸 Using TikTok thumbnail pattern (fallback):', metadata.thumbnail_url);
      }
    } else {
      console.log('⚠️ No video ID found in TikTok URL');
    }

    return metadata;
  }

  // Extract Instagram metadata
  private static async extractInstagramMetadata(url: string): Promise<PostMetadata> {
    const metadata: PostMetadata = { platform: 'instagram' };

    // Extract post ID
    const postIdMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    if (postIdMatch) {
      const postId = postIdMatch[1];
      
      // Instagram thumbnail URL (may need authentication)
      metadata.thumbnail_url = `https://www.instagram.com/p/${postId}/media/?size=l`;
      
      // Try oEmbed for more data
      try {
        const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail_url) {
            metadata.thumbnail_url = data.thumbnail_url;
          }
          if (data.author_name) {
            metadata.creator_name = data.author_name;
            metadata.creator_handle = `@${data.author_name}`;
          }
          if (data.title) {
            metadata.post_caption = data.title;
            metadata.hashtags = this.extractHashtags(data.title);
          }
        }
      } catch (error) {
        console.log('Instagram oEmbed failed');
      }
    }

    return metadata;
  }

  // Extract YouTube metadata
  private static async extractYouTubeMetadata(url: string): Promise<PostMetadata> {
    const metadata: PostMetadata = { platform: 'youtube' };

    // Extract video ID
    const patterns = [
      /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    let videoId: string | null = null;
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        videoId = match[1];
        break;
      }
    }

    if (videoId) {
      // YouTube thumbnails are predictable
      metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      // Try oEmbed for more data
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Use high quality thumbnail
          if (videoId) {
            metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          } else if (data.thumbnail_url) {
            metadata.thumbnail_url = data.thumbnail_url;
          }
          
          if (data.author_name) {
            metadata.creator_name = data.author_name;
            metadata.creator_handle = `@${data.author_name.replace(/\s+/g, '')}`;
          }
          
          if (data.title) {
            metadata.post_caption = data.title;
            metadata.hashtags = this.extractHashtags(data.title);
          }
        }
      } catch (error) {
        console.log('YouTube oEmbed failed');
      }
    }

    return metadata;
  }

  // Extract Twitter/X metadata
  private static async extractTwitterMetadata(url: string): Promise<PostMetadata> {
    const metadata: PostMetadata = { platform: 'twitter' };

    // Extract username from URL
    const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
    if (usernameMatch && !['i', 'home', 'explore'].includes(usernameMatch[1])) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    // Try oEmbed
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.author_name) {
          metadata.creator_name = data.author_name;
          metadata.creator_handle = `@${data.author_name}`;
        }
        
        // Extract text from HTML
        if (data.html) {
          const textMatch = data.html.match(/<p[^>]*>(.*?)<\/p>/);
          if (textMatch) {
            const caption = textMatch[1].replace(/<[^>]*>/g, '');
            metadata.post_caption = caption;
            metadata.hashtags = this.extractHashtags(caption);
          }
        }
      }
    } catch (error) {
      console.log('Twitter oEmbed failed');
    }

    // Twitter doesn't provide predictable thumbnail URLs
    // Return a placeholder or undefined
    metadata.thumbnail_url = undefined;

    return metadata;
  }

  // Extract hashtags from text
  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  // Get fallback thumbnail based on platform
  private static getFallbackThumbnail(url: string, platform: string): string | null {
    // For TikTok, try to extract video ID and use a pattern
    if (platform === 'tiktok') {
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch) {
        return `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoIdMatch[1]}`;
      }
    }
    
    // For YouTube, extract video ID
    if (platform === 'youtube') {
      const patterns = [
        /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
        }
      }
    }

    // For Instagram, try the media URL
    if (platform === 'instagram') {
      const postIdMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
      if (postIdMatch) {
        return `https://www.instagram.com/p/${postIdMatch[1]}/media/?size=l`;
      }
    }

    // No fallback available
    return null;
  }
}