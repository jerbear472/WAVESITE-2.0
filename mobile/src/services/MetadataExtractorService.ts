import { WebFetch } from 'react-native';

interface PostMetadata {
  creator?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  thumbnail?: string;
  hashtags?: string[];
}

class MetadataExtractorService {
  /**
   * Extract metadata from URL using meta tags
   * This works for most social media platforms that provide Open Graph tags
   */
  static async extractFromUrl(url: string): Promise<PostMetadata> {
    try {
      // Fetch the page HTML
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }
      
      const html = await response.text();
      
      // Extract metadata from meta tags
      const metadata: PostMetadata = {};
      
      // Extract Open Graph tags
      metadata.caption = this.extractMetaContent(html, 'og:title') || 
                        this.extractMetaContent(html, 'twitter:title') ||
                        this.extractMetaContent(html, 'description');
      
      metadata.thumbnail = this.extractMetaContent(html, 'og:image') ||
                          this.extractMetaContent(html, 'twitter:image');
      
      metadata.creator = this.extractMetaContent(html, 'og:site_name') ||
                        this.extractMetaContent(html, 'twitter:creator');
      
      // Platform-specific extraction
      if (url.includes('tiktok.com')) {
        metadata.creator = this.extractTikTokCreator(html) || metadata.creator;
        metadata.likes = this.extractTikTokLikes(html);
        metadata.comments = this.extractTikTokComments(html);
        metadata.hashtags = this.extractHashtags(metadata.caption || '');
      } else if (url.includes('instagram.com')) {
        metadata.creator = this.extractInstagramCreator(html) || metadata.creator;
        metadata.hashtags = this.extractHashtags(metadata.caption || '');
      }
      
      return metadata;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return {};
    }
  }
  
  private static extractMetaContent(html: string, property: string): string | undefined {
    const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : undefined;
  }
  
  private static extractTikTokCreator(html: string): string | undefined {
    // TikTok includes creator in the title format: "@username original sound - Name"
    const titleMatch = html.match(/@(\w+)[\s-]/);
    return titleMatch ? `@${titleMatch[1]}` : undefined;
  }
  
  private static extractTikTokLikes(html: string): number {
    // Look for likes count in JSON-LD or specific patterns
    const likesMatch = html.match(/"diggCount":(\d+)|"likes":(\d+)/);
    if (likesMatch) {
      return parseInt(likesMatch[1] || likesMatch[2]);
    }
    return 0;
  }
  
  private static extractTikTokComments(html: string): number {
    // Look for comments count
    const commentsMatch = html.match(/"commentCount":(\d+)|"comments":(\d+)/);
    if (commentsMatch) {
      return parseInt(commentsMatch[1] || commentsMatch[2]);
    }
    return 0;
  }
  
  private static extractInstagramCreator(html: string): string | undefined {
    // Instagram includes creator in various formats
    const creatorMatch = html.match(/"owner":\{"username":"([^"]+)"|@([a-zA-Z0-9._]+)/);
    if (creatorMatch) {
      const username = creatorMatch[1] || creatorMatch[2];
      return `@${username}`;
    }
    return undefined;
  }
  
  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.slice(0, 5) : []; // Limit to 5 hashtags
  }
  
  /**
   * Alternative approach using a headless browser service
   * This would be more reliable but requires a backend service
   */
  static async extractViaBackend(url: string): Promise<PostMetadata> {
    try {
      // Replace with your actual backend endpoint
      const backendUrl = process.env.METADATA_API_URL || 'https://api.wavesite.com/metadata';
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error('Backend metadata extraction failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error extracting via backend:', error);
      return {};
    }
  }
}

export default MetadataExtractorService;