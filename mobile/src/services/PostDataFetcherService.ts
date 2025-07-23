import { Platform } from 'react-native';

interface PostData {
  creator: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  thumbnail?: string;
  hashtags?: string[];
}

class PostDataFetcherService {
  // API endpoints for fetching post data
  // Note: In production, these should be handled by your backend to avoid CORS and API key issues
  private static RAPIDAPI_KEY = 'YOUR_RAPIDAPI_KEY'; // Replace with actual key or use env variable
  
  static async fetchPostData(url: string, platform: string): Promise<PostData | null> {
    try {
      switch (platform.toLowerCase()) {
        case 'tiktok':
          return await this.fetchTikTokData(url);
        case 'instagram':
          return await this.fetchInstagramData(url);
        case 'youtube':
          return await this.fetchYouTubeData(url);
        case 'twitter/x':
          return await this.fetchTwitterData(url);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error fetching post data:', error);
      return null;
    }
  }

  private static async fetchTikTokData(url: string): Promise<PostData | null> {
    try {
      // Extract video ID from URL
      const videoId = this.extractTikTokVideoId(url);
      if (!videoId) return null;

      // Option 1: Use TikTok's oEmbed API (limited data but official)
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) throw new Error('Failed to fetch TikTok data');
      
      const data = await response.json();
      
      // Parse the limited data from oEmbed
      return {
        creator: data.author_name || 'Unknown',
        caption: data.title || '',
        likes: 0, // oEmbed doesn't provide engagement data
        comments: 0,
        shares: 0,
        views: 0,
        thumbnail: data.thumbnail_url,
      };
      
      // Option 2: Use unofficial API or scraping service (more data but requires API key)
      // const apiUrl = `https://tiktok-api.p.rapidapi.com/video/${videoId}`;
      // const response = await fetch(apiUrl, {
      //   headers: {
      //     'X-RapidAPI-Key': this.RAPIDAPI_KEY,
      //     'X-RapidAPI-Host': 'tiktok-api.p.rapidapi.com'
      //   }
      // });
      
    } catch (error) {
      console.error('Error fetching TikTok data:', error);
      return null;
    }
  }

  private static async fetchInstagramData(url: string): Promise<PostData | null> {
    try {
      // Instagram's oEmbed API
      const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) throw new Error('Failed to fetch Instagram data');
      
      const data = await response.json();
      
      return {
        creator: data.author_name || 'Unknown',
        caption: data.title || '',
        likes: 0, // oEmbed doesn't provide engagement data
        comments: 0,
        shares: 0,
        views: 0,
        thumbnail: data.thumbnail_url,
      };
      
    } catch (error) {
      console.error('Error fetching Instagram data:', error);
      return null;
    }
  }

  private static async fetchYouTubeData(url: string): Promise<PostData | null> {
    try {
      // Extract video ID
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) return null;

      // YouTube oEmbed API
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) throw new Error('Failed to fetch YouTube data');
      
      const data = await response.json();
      
      return {
        creator: data.author_name || 'Unknown',
        caption: data.title || '',
        likes: 0, // Would need YouTube API v3 for engagement data
        comments: 0,
        shares: 0,
        views: 0,
        thumbnail: data.thumbnail_url,
      };
      
    } catch (error) {
      console.error('Error fetching YouTube data:', error);
      return null;
    }
  }

  private static async fetchTwitterData(url: string): Promise<PostData | null> {
    try {
      // Twitter's oEmbed API (now X)
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) throw new Error('Failed to fetch Twitter data');
      
      const data = await response.json();
      
      // Extract text from HTML
      const text = data.html ? this.extractTextFromHtml(data.html) : '';
      
      return {
        creator: data.author_name || 'Unknown',
        caption: text,
        likes: 0, // Would need Twitter API v2 for engagement data
        comments: 0,
        shares: 0,
        views: 0,
      };
      
    } catch (error) {
      console.error('Error fetching Twitter data:', error);
      return null;
    }
  }

  // Helper methods
  private static extractTikTokVideoId(url: string): string | null {
    const match = url.match(/video\/(\d+)/);
    return match ? match[1] : null;
  }

  private static extractYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  private static extractTextFromHtml(html: string): string {
    // Simple HTML text extraction
    return html.replace(/<[^>]*>/g, '').trim();
  }

  // Method to fetch with proxy server (recommended approach)
  static async fetchViaProxy(url: string, platform: string): Promise<PostData | null> {
    try {
      // Your backend endpoint that handles the actual API calls
      const proxyUrl = `https://your-backend.com/api/fetch-post-data`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, platform }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch via proxy');
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error fetching via proxy:', error);
      return null;
    }
  }
}

export default PostDataFetcherService;