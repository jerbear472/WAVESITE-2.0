// Specialized TikTok thumbnail extractor with latest patterns
// Updated January 2025

export class TikTokThumbnailExtractor {
  // TikTok oEmbed endpoint (most reliable when it works)
  static async extractViaOEmbed(url: string): Promise<string | null> {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      
      // Try direct fetch first (works in some environments)
      try {
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnail_url) {
            console.log('TikTok thumbnail from direct oEmbed:', data.thumbnail_url);
            return data.thumbnail_url;
          }
        }
      } catch (directError) {
        console.log('Direct oEmbed failed, trying proxy');
      }
      
      // Try via proxy
      const proxyResponse = await fetch(`/api/proxy?url=${encodeURIComponent(oembedUrl)}`);
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        if (data.thumbnail_url) {
          console.log('TikTok thumbnail from proxied oEmbed:', data.thumbnail_url);
          return data.thumbnail_url;
        }
      }
    } catch (error) {
      console.log('TikTok oEmbed extraction failed:', error);
    }
    return null;
  }
  
  // Extract video ID from various TikTok URL formats
  static extractVideoId(url: string): string | null {
    // Clean the URL
    url = url.trim();
    
    // Pattern 1: Standard video URL - /video/1234567890
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      return videoIdMatch[1];
    }
    
    // Pattern 2: Mobile share URL - vm.tiktok.com/XXXXXX
    const shortIdMatch = url.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/);
    if (shortIdMatch) {
      // Note: Short IDs need to be resolved to full video IDs
      // For now, we'll try to use them as-is
      return shortIdMatch[1];
    }
    
    // Pattern 3: User video URL - /@username/video/1234567890
    const userVideoMatch = url.match(/\/@[^\/]+\/video\/(\d+)/);
    if (userVideoMatch) {
      return userVideoMatch[1];
    }
    
    return null;
  }
  
  // Extract username from URL
  static extractUsername(url: string): string | null {
    const usernameMatch = url.match(/\/@([^\/\?]+)/);
    return usernameMatch ? usernameMatch[1] : null;
  }
  
  // Generate thumbnail URLs using known CDN patterns
  static generateThumbnailPatterns(videoId: string, username?: string): string[] {
    const patterns: string[] = [];
    
    // Current TikTok CDN patterns (as of January 2025)
    // These are the most common CDN domains and paths
    
    // Pattern 1: Singapore CDN (most common for US/Global content)
    patterns.push(
      `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037/${videoId}~c5_720x720.jpeg`,
      `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037/${videoId}~tplv-photomode-image.jpeg`,
      `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-noop.image`
    );
    
    // Pattern 2: US Virginia CDN
    patterns.push(
      `https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/${videoId}~c5_720x720.jpeg`,
      `https://p16-sign-va.tiktokcdn.com/tos-useast2a-p-0037-aiso/${videoId}~c5_720x720.jpeg`
    );
    
    // Pattern 3: Global CDN variations
    patterns.push(
      `https://p16-sign.tiktokcdn.com/obj/${videoId}~c5_720x720.jpeg`,
      `https://p19-sign.tiktokcdn.com/obj/${videoId}~c5_720x720.jpeg`,
      `https://p77-sign-sg.tiktokcdn.com/${videoId}~tplv-obj.image`
    );
    
    // Pattern 4: Newer CDN patterns (2024-2025)
    patterns.push(
      `https://p16-pu-sign-sg.tiktokcdn.com/${videoId}~c5_720x720.jpeg`,
      `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037-sg/${videoId}~c5_100x100.jpeg`,
      `https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/${videoId}~c5_720x720.jpeg`
    );
    
    // Pattern 5: If we have username, try avatar-based patterns
    if (username) {
      patterns.push(
        `https://p16-sign-sg.tiktokcdn.com/aweme/720x720/tos-alisg-avt-0068/${videoId}.jpeg`,
        `https://p16-sign-sg.tiktokcdn.com/musically-maliva-obj/${videoId}~c5_720x720.jpeg`
      );
    }
    
    return patterns;
  }
  
  // Test which thumbnail URL actually works
  static async findWorkingThumbnail(patterns: string[]): Promise<string | null> {
    // Test patterns in parallel for speed
    const tests = patterns.map(async (url) => {
      try {
        // Use HEAD request to check if image exists
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
          method: 'HEAD'
        });
        
        if (response.ok) {
          console.log('Working TikTok thumbnail found:', url);
          return url;
        }
      } catch {
        // Pattern didn't work
      }
      return null;
    });
    
    // Wait for all tests to complete
    const results = await Promise.all(tests);
    
    // Return first working URL
    return results.find(url => url !== null) || null;
  }
  
  // Main extraction method
  static async extract(url: string): Promise<string | null> {
    console.log('TikTok thumbnail extraction starting for:', url);
    
    // Step 1: Try oEmbed first (most reliable)
    const oembedThumbnail = await this.extractViaOEmbed(url);
    if (oembedThumbnail) {
      return oembedThumbnail;
    }
    
    // Step 2: Extract video ID and generate patterns
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      console.log('Could not extract TikTok video ID from URL');
      return null;
    }
    
    console.log('Extracted TikTok video ID:', videoId);
    const username = this.extractUsername(url);
    
    // Step 3: Generate possible thumbnail URLs
    const patterns = this.generateThumbnailPatterns(videoId, username || undefined);
    
    // Step 4: Test patterns to find working thumbnail
    const workingThumbnail = await this.findWorkingThumbnail(patterns);
    if (workingThumbnail) {
      return workingThumbnail;
    }
    
    // Step 5: Return best guess even if we can't verify it
    // (Sometimes the image loads in browser but not via proxy)
    const fallbackUrl = patterns[0];
    console.log('No verified thumbnail found, using fallback:', fallbackUrl);
    return fallbackUrl;
  }
  
  // Quick extraction without verification (faster but less reliable)
  static extractQuick(url: string): string | null {
    const videoId = this.extractVideoId(url);
    if (!videoId) return null;
    
    // Return most likely pattern without verification
    return `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037/${videoId}~c5_720x720.jpeg`;
  }
}