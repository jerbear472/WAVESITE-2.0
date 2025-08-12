// Simple, working thumbnail extractor
// No complicated API calls, just direct thumbnail URLs that work

interface SimpleMetadata {
  thumbnail_url?: string;
  creator_handle?: string;
  platform?: string;
}

export class SimpleThumbnailExtractor {
  static async extractFromUrl(url: string): Promise<SimpleMetadata> {
    console.log('🎯 Simple extraction for:', url);
    
    const metadata: SimpleMetadata = {};
    
    // TikTok
    if (url.includes('tiktok.com')) {
      metadata.platform = 'tiktok';
      
      // Extract username
      const usernameMatch = url.match(/@([^\/\?]+)/);
      if (usernameMatch) {
        metadata.creator_handle = `@${usernameMatch[1]}`;
      }
      
      // Extract video ID
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        // For TikTok, we'll use our API endpoint which handles the thumbnail extraction
        // This avoids CORS issues with direct CDN access
        metadata.thumbnail_url = `/api/tiktok-thumbnail?id=${videoId}`;
        console.log('✅ TikTok thumbnail via API:', metadata.thumbnail_url);
      }
    }
    
    // YouTube - these always work
    else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      metadata.platform = 'youtube';
      
      // Extract video ID
      let videoId = null;
      if (url.includes('youtube.com')) {
        const match = url.match(/[?&]v=([^&]+)/);
        if (match) videoId = match[1];
      } else if (url.includes('youtu.be')) {
        const match = url.match(/youtu\.be\/([^?]+)/);
        if (match) videoId = match[1];
      }
      
      if (videoId) {
        // YouTube thumbnails are reliable
        metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        console.log('✅ YouTube thumbnail:', metadata.thumbnail_url);
      }
    }
    
    // Instagram
    else if (url.includes('instagram.com')) {
      metadata.platform = 'instagram';
      
      // Extract post ID
      const postMatch = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
      if (postMatch) {
        const postId = postMatch[2];
        // Instagram media endpoint
        metadata.thumbnail_url = `https://www.instagram.com/p/${postId}/media/?size=l`;
        console.log('✅ Instagram thumbnail:', metadata.thumbnail_url);
      }
    }
    
    return metadata;
  }
}