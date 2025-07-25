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

interface ExtractedData {
  platform: string;
  metadata: PostMetadata;
  title?: string;
  description?: string;
}

export class MetadataExtractor {
  private static readonly API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  static async extractFromUrl(url: string): Promise<ExtractedData> {
    const platform = this.detectPlatform(url);
    
    // First, extract basic data from URL patterns
    const basicData = this.extractBasicDataFromUrl(url, platform);
    
    // Try to fetch metadata using different methods based on platform
    let enhancedData: ExtractedData | null = null;
    
    try {
      switch (platform) {
        case 'tiktok':
          enhancedData = await this.extractTikTokMetadata(url, basicData);
          break;
        case 'instagram':
          enhancedData = await this.extractInstagramMetadata(url, basicData);
          break;
        case 'youtube':
          enhancedData = await this.extractYouTubeMetadata(url, basicData);
          break;
        case 'twitter':
          enhancedData = await this.extractTwitterMetadata(url, basicData);
          break;
      }
    } catch (error) {
      console.error(`Failed to extract ${platform} metadata:`, error);
    }
    
    // Return enhanced data if available, otherwise fall back to basic data
    return enhancedData || {
      platform,
      metadata: basicData.metadata,
      title: basicData.title,
      description: basicData.description
    };
  }
  
  private static async extractTikTokMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // Extract video ID from URL
      const videoIdMatch = url.match(/video\/(\d+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      
      // Try to use TikTok's oEmbed API
      if (videoId) {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract creator handle from author_url or author_name
          let creatorHandle = basicData.metadata.creator_handle;
          if (data.author_url) {
            const handleMatch = data.author_url.match(/@([^\/\?]+)/);
            if (handleMatch) {
              creatorHandle = `@${handleMatch[1]}`;
            }
          } else if (data.author_name) {
            creatorHandle = data.author_name.startsWith('@') ? data.author_name : `@${data.author_name}`;
          }
          
          return {
            platform: 'tiktok',
            metadata: {
              ...basicData.metadata,
              creator_handle: creatorHandle,
              creator_name: data.author_name || creatorHandle,
              post_caption: data.title || '',
              thumbnail_url: data.thumbnail_url,
              // Extract hashtags from title
              hashtags: this.extractHashtags(data.title || '')
            },
            title: data.title?.substring(0, 100) || basicData.title,
            description: data.title || basicData.description
          };
        }
      }
    } catch (error) {
      console.error('TikTok metadata extraction error:', error);
    }
    
    return basicData;
  }
  
  private static async extractInstagramMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // Instagram's oEmbed API
      const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        return {
          platform: 'instagram',
          metadata: {
            ...basicData.metadata,
            creator_handle: data.author_name ? `@${data.author_name}` : basicData.metadata.creator_handle,
            creator_name: data.author_name,
            post_caption: data.title || '',
            thumbnail_url: data.thumbnail_url,
            hashtags: this.extractHashtags(data.title || '')
          },
          title: data.title?.substring(0, 100) || basicData.title,
          description: data.title || basicData.description
        };
      }
    } catch (error) {
      console.error('Instagram metadata extraction error:', error);
    }
    
    return basicData;
  }
  
  private static async extractYouTubeMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // YouTube's oEmbed API
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        return {
          platform: 'youtube',
          metadata: {
            ...basicData.metadata,
            creator_handle: data.author_name ? `@${data.author_name.replace(/\s+/g, '')}` : basicData.metadata.creator_handle,
            creator_name: data.author_name,
            post_caption: data.title || '',
            thumbnail_url: data.thumbnail_url,
            hashtags: this.extractHashtags(data.title || '')
          },
          title: data.title || basicData.title,
          description: data.title || basicData.description
        };
      }
    } catch (error) {
      console.error('YouTube metadata extraction error:', error);
    }
    
    return basicData;
  }
  
  private static async extractTwitterMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // Try to use Twitter's oEmbed API (may require authentication)
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract text content from HTML
        const textMatch = data.html?.match(/<p[^>]*>(.*?)<\/p>/);
        const caption = textMatch ? textMatch[1].replace(/<[^>]*>/g, '') : '';
        
        return {
          platform: 'twitter',
          metadata: {
            ...basicData.metadata,
            creator_handle: data.author_name ? `@${data.author_name}` : basicData.metadata.creator_handle,
            creator_name: data.author_name,
            post_caption: caption,
            hashtags: this.extractHashtags(caption)
          },
          title: caption.substring(0, 100) || basicData.title,
          description: caption || basicData.description
        };
      }
    } catch (error) {
      console.error('Twitter metadata extraction error:', error);
    }
    
    return basicData;
  }
  
  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  private static detectPlatform(url: string): string {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'other';
  }

  private static extractBasicDataFromUrl(url: string, platform: string): ExtractedData {
    const metadata: PostMetadata = {};
    let title = '';
    let description = '';

    try {
      const urlObj = new URL(url);
      
      switch (platform) {
        case 'tiktok':
          // Extract username from TikTok URL: https://www.tiktok.com/@username/video/123
          const tiktokMatch = url.match(/@([^\/]+)/);
          if (tiktokMatch) {
            metadata.creator_handle = `@${tiktokMatch[1]}`;
          }
          title = `TikTok video${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Please fill in the post details below';
          break;
          
        case 'instagram':
          // Extract from Instagram URL patterns
          if (url.includes('/p/') || url.includes('/reel/')) {
            // Try to extract username from URL if it's in the format /username/p/postid
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length >= 3 && pathParts[1] === 'p') {
              metadata.creator_handle = `@${pathParts[0]}`;
            } else if (pathParts.length >= 3 && pathParts[1] === 'reel') {
              metadata.creator_handle = `@${pathParts[0]}`;
            }
          }
          title = `Instagram ${url.includes('/reel/') ? 'Reel' : 'post'}${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Please fill in the post details below';
          break;
          
        case 'youtube':
          // Extract channel name if it's in the URL (e.g., youtube.com/@channelname/...)
          const ytChannelMatch = url.match(/youtube\.com\/@([^\/]+)/);
          if (ytChannelMatch) {
            metadata.creator_handle = `@${ytChannelMatch[1]}`;
          }
          
          // Extract video ID
          const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
          title = `YouTube video${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Please fill in the video details below';
          break;
          
        case 'twitter':
          // Extract username from Twitter URL: https://twitter.com/username/status/123
          const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
          if (twitterMatch && !['i', 'home', 'explore', 'notifications', 'messages'].includes(twitterMatch[1])) {
            metadata.creator_handle = `@${twitterMatch[1]}`;
          }
          title = `Tweet${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Please fill in the tweet details below';
          break;
          
        default:
          title = 'Social media post';
          description = 'Please fill in the post details below';
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
    }

    return { platform, metadata, title, description };
  }
}