// Enhanced MetadataExtractor with better error handling and debugging
// Replace the content of web/lib/metadataExtractor.ts with this

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
    console.log('🔍 MetadataExtractor: Starting extraction for:', url);
    
    const platform = this.detectPlatform(url);
    console.log('📱 Platform detected:', platform);
    
    // First, extract basic data from URL patterns
    const basicData = this.extractBasicDataFromUrl(url, platform);
    console.log('📊 Basic data extracted:', basicData);
    
    // Try to fetch metadata using different methods based on platform
    let enhancedData: ExtractedData | null = null;
    
    try {
      switch (platform) {
        case 'tiktok':
          console.log('🎵 Attempting TikTok metadata extraction...');
          enhancedData = await this.extractTikTokMetadata(url, basicData);
          break;
        case 'instagram':
          console.log('📸 Attempting Instagram metadata extraction...');
          enhancedData = await this.extractInstagramMetadata(url, basicData);
          break;
        case 'youtube':
          console.log('▶️ Attempting YouTube metadata extraction...');
          enhancedData = await this.extractYouTubeMetadata(url, basicData);
          break;
        case 'twitter':
          console.log('🐦 Attempting Twitter metadata extraction...');
          enhancedData = await this.extractTwitterMetadata(url, basicData);
          break;
        default:
          console.log('🌐 Using basic extraction for unknown platform');
      }
    } catch (error) {
      console.error(`❌ Failed to extract ${platform} metadata:`, error);
    }
    
    // Return metadata with title and description
    const finalData = enhancedData || basicData;
    const result = {
      ...finalData.metadata,
      title: finalData.title,
      description: finalData.description
    };
    
    console.log('✅ Final extracted data:', result);
    return result;
  }
  
  private static async extractTikTokMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // Extract video ID from URL
      const videoIdMatch = url.match(/video\/(\d+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      console.log('🎵 TikTok video ID:', videoId);
      
      // Try to use TikTok's oEmbed API
      if (videoId) {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        console.log('🔗 Trying TikTok oEmbed URL:', oembedUrl);
        
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(oembedUrl)}`;
        console.log('🌐 Using proxy URL:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        console.log('📡 Proxy response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 TikTok oEmbed data received:', data);
          
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
          
          const enhanced = {
            platform: 'tiktok',
            metadata: {
              ...basicData.metadata,
              creator_handle: creatorHandle,
              creator_name: data.author_name || creatorHandle,
              post_caption: caption,
              thumbnail_url: data.thumbnail_url,
              // Extract hashtags from title
              hashtags: this.extractHashtags(data.title || ''),
              // TikTok doesn't provide post date via oEmbed, but we can estimate from video ID
              posted_at: this.estimateTikTokPostDate(videoId)
            },
            title: caption.substring(0, 50) || 'TikTok Video',
            description: data.title || basicData.description
          };
          
          console.log('✅ Enhanced TikTok data:', enhanced);
          return enhanced;
        } else {
          console.warn('⚠️ TikTok oEmbed failed with status:', response.status);
          const errorText = await response.text();
          console.warn('⚠️ Error response:', errorText);
        }
      }
    } catch (error) {
      console.error('❌ TikTok metadata extraction error:', error);
    }
    
    console.log('🔄 Falling back to basic TikTok data');
    return basicData;
  }
  
  private static async extractInstagramMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // Instagram's oEmbed API
      const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
      console.log('📸 Trying Instagram oEmbed URL:', oembedUrl);
      
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      console.log('📡 Instagram response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Instagram oEmbed data:', data);
        
        const enhanced = {
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
        
        console.log('✅ Enhanced Instagram data:', enhanced);
        return enhanced;
      } else {
        console.warn('⚠️ Instagram oEmbed failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ Instagram metadata extraction error:', error);
    }
    
    console.log('🔄 Falling back to basic Instagram data');
    return basicData;
  }
  
  private static async extractYouTubeMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // YouTube's oEmbed API
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      console.log('▶️ Trying YouTube oEmbed URL:', oembedUrl);
      
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      console.log('📡 YouTube response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 YouTube oEmbed data:', data);
        
        const enhanced = {
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
        
        console.log('✅ Enhanced YouTube data:', enhanced);
        return enhanced;
      } else {
        console.warn('⚠️ YouTube oEmbed failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ YouTube metadata extraction error:', error);
    }
    
    console.log('🔄 Falling back to basic YouTube data');
    return basicData;
  }
  
  private static async extractTwitterMetadata(url: string, basicData: ExtractedData): Promise<ExtractedData> {
    try {
      // Try to use Twitter's oEmbed API (may require authentication)
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      console.log('🐦 Trying Twitter oEmbed URL:', oembedUrl);
      
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      console.log('📡 Twitter response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Twitter oEmbed data:', data);
        
        // Extract text content from HTML
        const textMatch = data.html?.match(/<p[^>]*>(.*?)<\/p>/);
        const caption = textMatch ? textMatch[1].replace(/<[^>]*>/g, '') : '';
        
        const enhanced = {
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
        
        console.log('✅ Enhanced Twitter data:', enhanced);
        return enhanced;
      } else {
        console.warn('⚠️ Twitter oEmbed failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ Twitter metadata extraction error:', error);
    }
    
    console.log('🔄 Falling back to basic Twitter data');
    return basicData;
  }
  
  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    const hashtags = matches ? matches.map(tag => tag.substring(1)) : [];
    console.log('🏷️ Extracted hashtags:', hashtags);
    return hashtags;
  }

  private static estimateTikTokPostDate(videoId: string | null): string {
    // TikTok video IDs are timestamp-based
    // This is an approximation based on ID patterns
    if (videoId) {
      // Convert the ID to a timestamp (rough estimate)
      const timestamp = parseInt(videoId.substring(0, 10));
      if (!isNaN(timestamp) && timestamp > 1600000000) { // After Sept 2020
        const date = new Date(timestamp * 1000).toISOString();
        console.log('📅 Estimated TikTok post date:', date);
        return date;
      }
    }
    const now = new Date().toISOString();
    console.log('📅 Using current date for TikTok post:', now);
    return now;
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
          description = 'Trending TikTok content';
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
          description = 'Trending Instagram content';
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
          description = 'Trending YouTube content';
          break;
          
        case 'twitter':
          // Extract username from Twitter URL: https://twitter.com/username/status/123
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
      console.error('❌ Error parsing URL:', error);
    }

    const result = { platform, metadata, title, description };
    console.log('📋 Basic extraction result:', result);
    return result;
  }
}