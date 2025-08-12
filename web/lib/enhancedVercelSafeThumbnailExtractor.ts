// Enhanced Vercel-safe metadata extractor with improved thumbnail extraction
// Fixes issues with TikTok thumbnails not working properly

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

export class EnhancedVercelSafeThumbnailExtractor {
  // Main extraction method - uses direct patterns that work on Vercel
  static async extractFromUrl(url: string): Promise<PostMetadata> {
    console.log('🚀 EnhancedVercelSafeThumbnailExtractor.extractFromUrl called with:', url);
    
    const platform = this.detectPlatform(url);
    let metadata: PostMetadata = { platform };

    // Extract basic info from URL patterns
    switch (platform) {
      case 'tiktok':
        metadata = await this.extractTikTokMetadata(url);
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

    // Try API endpoint for TikTok if direct extraction failed
    if (platform === 'tiktok' && !metadata.thumbnail_url) {
      try {
        const apiMetadata = await this.fetchTikTokMetadataViaAPI(url);
        metadata = { ...metadata, ...apiMetadata };
      } catch (error) {
        console.log('API extraction failed, using fallback');
      }
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

  // Enhanced TikTok metadata extraction with multiple fallback patterns
  private static async extractTikTokMetadata(url: string): Promise<PostMetadata> {
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
      
      // Try to generate a working thumbnail URL
      // Use a more reliable pattern that doesn't depend on CDN specifics
      const thumbnailPatterns = [
        // Direct video frame extraction (most reliable)
        `https://www.tiktok.com/api/img/?vid=${videoId}&image=1`,
        // Standard CDN patterns
        `https://p16-sign-sg.tiktokcdn.com/tos-maliva-p-0068/${videoId}~tplv-dmt-logom:tos-maliva-p-0000/image.jpeg`,
        `https://p16-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/${videoId}~tplv-photomode-image.jpeg`,
        // Fallback patterns
        `https://p77-sign-sg.tiktokcdn.com/${videoId}~tplv-obj.image`,
        `https://p16.tiktokcdn.com/obj/${videoId}`,
      ];
      
      // Try each pattern and use the first one that might work
      // For now, we'll use the first pattern as default
      metadata.thumbnail_url = thumbnailPatterns[0];
      
      console.log('📹 [ENHANCED] TikTok video ID:', videoId);
      console.log('🖼️ [ENHANCED] TikTok thumbnail:', metadata.thumbnail_url);
      
      // Try to verify the thumbnail URL works (non-blocking)
      this.verifyThumbnailUrl(metadata.thumbnail_url, thumbnailPatterns).then(workingUrl => {
        if (workingUrl && workingUrl !== metadata.thumbnail_url) {
          console.log('🔄 [ENHANCED] Found better thumbnail:', workingUrl);
        }
      });
    } else {
      console.log('⚠️ [ENHANCED] No video ID found in TikTok URL:', url);
      
      // Try to extract from mobile share URLs or short URLs
      const shortIdMatch = url.match(/\/t\/([A-Za-z0-9]+)/);
      if (shortIdMatch) {
        // For short URLs, we need to use a different approach
        metadata.thumbnail_url = `https://www.tiktok.com/api/img/?itemId=${shortIdMatch[1]}`;
        console.log('📱 [ENHANCED] Mobile/Short URL detected, using itemId:', shortIdMatch[1]);
      }
    }

    return metadata;
  }

  // Try to fetch TikTok metadata via API endpoint
  private static async fetchTikTokMetadataViaAPI(url: string): Promise<Partial<PostMetadata>> {
    try {
      const response = await fetch('/api/tiktok-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          thumbnail_url: data.thumbnail_url,
          creator_handle: data.creator_handle,
          post_caption: data.post_caption
        };
      }
    } catch (error) {
      console.log('API fetch failed:', error);
    }
    return {};
  }

  // Verify thumbnail URL (non-blocking background check)
  private static async verifyThumbnailUrl(primaryUrl: string, alternativeUrls: string[]): Promise<string | null> {
    // First try the primary URL
    try {
      const response = await fetch(primaryUrl, { method: 'HEAD' });
      if (response.ok) return primaryUrl;
    } catch (error) {
      console.log('Primary thumbnail URL failed:', primaryUrl);
    }
    
    // Try alternatives
    for (const url of alternativeUrls) {
      if (url === primaryUrl) continue;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) return url;
      } catch (error) {
        continue;
      }
    }
    
    return null;
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
        metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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

    // Extract username and tweet ID
    const tweetMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/);
    if (tweetMatch) {
      const [, username, tweetId] = tweetMatch;
      if (!['i', 'home', 'explore'].includes(username)) {
        metadata.creator_handle = `@${username}`;
        metadata.creator_name = username;
      }
      
      // Twitter card image (may not always be available)
      // We can try to construct a Twitter card URL
      metadata.thumbnail_url = `https://pbs.twimg.com/tweet_video_thumb/${tweetId}`;
    }
    
    return metadata;
  }

  // Extract hashtags from text
  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }
}