// Enhanced Vercel-safe metadata extractor with improved thumbnail extraction
// Fixes issues with TikTok thumbnails not working properly

import { TikTokOembedExtractor } from './tiktokOembedExtractor';

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

  // Enhanced TikTok metadata extraction
  private static async extractTikTokMetadata(url: string): Promise<PostMetadata> {
    console.log('🎬 [ENHANCED] Extracting TikTok metadata for:', url);
    
    const metadata: PostMetadata = { platform: 'tiktok' };

    // Extract username
    const usernameMatch = url.match(/@([^\/\?]+)/);
    if (usernameMatch) {
      metadata.creator_handle = `@${usernameMatch[1]}`;
      metadata.creator_name = usernameMatch[1];
    }

    // Extract video ID
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      
      try {
        // Call our API endpoint to get the thumbnail
        const response = await fetch('/api/tiktok-thumbnail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail_url) {
            metadata.thumbnail_url = data.thumbnail_url;
            console.log('✅ [ENHANCED] Got thumbnail from API:', data.thumbnail_url);
          }
          if (data.post_caption) {
            metadata.post_caption = data.post_caption;
          }
          if (data.creator_handle) {
            metadata.creator_handle = data.creator_handle;
            metadata.creator_name = data.creator_name || data.creator_handle.replace('@', '');
          }
        } else {
          console.log('⚠️ [ENHANCED] API endpoint failed, using direct CDN patterns');
          // Fallback to direct CDN patterns
          metadata.thumbnail_url = `https://p16-sign-sg.tiktokcdn.com/obj/${videoId}~c5_300x400.jpeg`;
        }
      } catch (error) {
        console.log('⚠️ [ENHANCED] Failed to call API, using fallback thumbnail');
        // Use a direct CDN pattern as fallback
        metadata.thumbnail_url = `https://p16.tiktokcdn.com/obj/tos-maliva-p-0068/${videoId}`;
      }
      
      console.log('📹 [ENHANCED] TikTok video ID:', videoId);
      console.log('🖼️ [ENHANCED] Thumbnail URL:', metadata.thumbnail_url);
    } else {
      console.log('⚠️ [ENHANCED] No video ID found in TikTok URL:', url);
      
      // Try to extract from mobile share URLs or short URLs
      const shortIdMatch = url.match(/\/t\/([A-Za-z0-9]+)/);
      if (shortIdMatch) {
        // Try to call API with the short URL
        try {
          const response = await fetch('/api/tiktok-thumbnail', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.thumbnail_url) {
              metadata.thumbnail_url = data.thumbnail_url;
            }
          }
        } catch (error) {
          metadata.thumbnail_url = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23000'/%3E%3Ctext x='200' y='200' font-family='Arial' font-size='20' fill='%23ff0050' text-anchor='middle'%3ETikTok Short Link%3C/text%3E%3C/svg%3E`;
        }
        console.log('📱 [ENHANCED] Mobile/Short URL detected');
      }
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
        // Try maxresdefault first, then fall back to hqdefault
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