// Clean MetadataExtractor without excessive logging that interferes with login
// Replace web/lib/metadataExtractor.ts with this version

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

  static async extractFromUrl(url: string): Promise<PostMetadata & { title?: string; description?: string }> {
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
      // Silently fall back to basic data
    }
    
    // Return metadata with title and description
    const finalData = enhancedData || basicData;
    return {
      ...finalData.metadata,
      title: finalData.title,
      description: finalData.description
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
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(oembedUrl)}`;
        
        const response = await fetch(proxyUrl);
        
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
          
          // Clean up the caption - remove hashtags from the end to get actual caption
          let caption = data.title || '';
          const hashtagIndex = caption.search(/#\w+/);
          if (hashtagIndex > 0) {
            caption = caption.substring(0, hashtagIndex).trim();
          }
          
          // Ensure we have a thumbnail URL - use high quality version if available
          let thumbnailUrl = data.thumbnail_url;
          if (!thumbnailUrl && data.thumbnail_url_hd) {
            thumbnailUrl = data.thumbnail_url_hd;
          }
          if (!thumbnailUrl && data.thumbnail_url_sd) {
            thumbnailUrl = data.thumbnail_url_sd;
          }
          
          return {
            platform: 'tiktok',
            metadata: {
              ...basicData.metadata,
              creator_handle: creatorHandle,
              creator_name: data.author_name || creatorHandle,
              post_caption: caption,
              thumbnail_url: thumbnailUrl,
              hashtags: this.extractHashtags(data.title || ''),
              posted_at: this.estimateTikTokPostDate(videoId)
            },
            title: caption.substring(0, 50) || 'TikTok Video',
            description: data.title || basicData.description
          };
        }
      }
    } catch (error) {
      // Silently fall back
    }
    
    return basicData;
  }
  
  private static async extractInstagramMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
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
      // Silently fall back
    }
    
    return basicData;
  }
  
  private static async extractYouTubeMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract video ID for high-quality thumbnail
        let thumbnailUrl = data.thumbnail_url;
        const videoIdMatch = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch && videoIdMatch[1]) {
          // Use maxresdefault for highest quality, fall back to hqdefault
          thumbnailUrl = `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
        }
        
        return {
          platform: 'youtube',
          metadata: {
            ...basicData.metadata,
            creator_handle: data.author_name ? `@${data.author_name.replace(/\s+/g, '')}` : basicData.metadata.creator_handle,
            creator_name: data.author_name,
            post_caption: data.title || '',
            thumbnail_url: thumbnailUrl,
            hashtags: this.extractHashtags(data.title || '')
          },
          title: data.title || basicData.title,
          description: data.title || basicData.description
        };
      }
    } catch (error) {
      // Silently fall back
    }
    
    return basicData;
  }
  
  private static async extractTwitterMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
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
      // Silently fall back
    }
    
    return basicData;
  }
  
  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  private static estimateTikTokPostDate(videoId: string | null): string {
    if (videoId) {
      const timestamp = parseInt(videoId.substring(0, 10));
      if (!isNaN(timestamp) && timestamp > 1600000000) {
        return new Date(timestamp * 1000).toISOString();
      }
    }
    return new Date().toISOString();
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
          const tiktokMatch = url.match(/@([^\/]+)/);
          if (tiktokMatch) {
            metadata.creator_handle = `@${tiktokMatch[1]}`;
          }
          title = `TikTok video${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Trending TikTok content';
          break;
          
        case 'instagram':
          if (url.includes('/p/') || url.includes('/reel/')) {
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length >= 3 && pathParts[1] === 'p') {
              metadata.creator_handle = `@${pathParts[0]}`;
            } else if (pathParts.length >= 3 && pathParts[1] === 'reel') {
              metadata.creator_handle = `@${pathParts[0]}`;
            }
          }
          title = `Instagram ${url.includes('/reel/') ? 'Reel' : 'post'}${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Trending Instagram content';
          break;
          
        case 'youtube':
          const ytChannelMatch = url.match(/youtube\.com\/@([^\/]+)/);
          if (ytChannelMatch) {
            metadata.creator_handle = `@${ytChannelMatch[1]}`;
          }
          title = `YouTube video${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Trending YouTube content';
          break;
          
        case 'twitter':
          const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
          if (twitterMatch && !['i', 'home', 'explore', 'notifications', 'messages'].includes(twitterMatch[1])) {
            metadata.creator_handle = `@${twitterMatch[1]}`;
          }
          title = `Tweet${metadata.creator_handle ? ` by ${metadata.creator_handle}` : ''}`;
          description = 'Trending Twitter content';
          break;
          
        default:
          title = 'Social media trend';
          description = 'Trending social media content';
      }
    } catch (error) {
      // Silently handle error
    }

    return { platform, metadata, title, description };
  }
}