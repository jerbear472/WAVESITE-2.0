// TikTok oEmbed extractor - uses TikTok's official oEmbed API
// This is the most reliable way to get thumbnails that actually work

interface TikTokOembedResponse {
  version: string;
  type: string;
  title?: string;
  author_url?: string;
  author_name?: string;
  width?: number;
  height?: number;
  html?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  provider_url?: string;
  provider_name?: string;
}

export class TikTokOembedExtractor {
  static async extractThumbnail(url: string): Promise<string | null> {
    try {
      // Use TikTok's official oEmbed endpoint
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      
      console.log('🎥 [TikTok oEmbed] Fetching from:', oembedUrl);
      
      // Try to fetch via our proxy first (works in development)
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
        
        if (response.ok) {
          const data: TikTokOembedResponse = await response.json();
          
          if (data.thumbnail_url) {
            console.log('✅ [TikTok oEmbed] Got thumbnail:', data.thumbnail_url);
            return data.thumbnail_url;
          }
        }
      } catch (proxyError) {
        console.log('⚠️ [TikTok oEmbed] Proxy failed, trying direct fetch');
      }
      
      // Fallback: Try direct fetch (may fail due to CORS)
      try {
        const directResponse = await fetch(oembedUrl);
        
        if (directResponse.ok) {
          const data: TikTokOembedResponse = await directResponse.json();
          
          if (data.thumbnail_url) {
            console.log('✅ [TikTok oEmbed] Got thumbnail (direct):', data.thumbnail_url);
            return data.thumbnail_url;
          }
        }
      } catch (directError) {
        console.log('⚠️ [TikTok oEmbed] Direct fetch failed');
      }
      
      // If oEmbed fails, generate a fallback URL based on video ID
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        // Use a simpler CDN pattern that's more likely to work
        const fallbackUrl = `https://www.tiktok.com/api/img/?itemId=${videoId}`;
        console.log('🔄 [TikTok oEmbed] Using fallback URL:', fallbackUrl);
        return fallbackUrl;
      }
      
    } catch (error) {
      console.error('❌ [TikTok oEmbed] Error:', error);
    }
    
    return null;
  }
  
  static async extractFullMetadata(url: string): Promise<any> {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      
      // Try via proxy
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      
      if (response.ok) {
        const data: TikTokOembedResponse = await response.json();
        
        // Extract username from author_name or URL
        let username = data.author_name;
        if (!username) {
          const usernameMatch = url.match(/@([^\/\?]+)/);
          if (usernameMatch) {
            username = usernameMatch[1];
          }
        }
        
        return {
          thumbnail_url: data.thumbnail_url,
          creator_handle: username ? `@${username}` : null,
          creator_name: data.author_name,
          post_caption: data.title,
          platform: 'tiktok'
        };
      }
    } catch (error) {
      console.error('❌ [TikTok oEmbed] Full extraction error:', error);
    }
    
    // Return basic metadata from URL
    const usernameMatch = url.match(/@([^\/\?]+)/);
    const videoIdMatch = url.match(/video\/(\d+)/);
    
    return {
      thumbnail_url: videoIdMatch ? `https://www.tiktok.com/api/img/?itemId=${videoIdMatch[1]}` : null,
      creator_handle: usernameMatch ? `@${usernameMatch[1]}` : null,
      creator_name: usernameMatch ? usernameMatch[1] : null,
      platform: 'tiktok'
    };
  }
}