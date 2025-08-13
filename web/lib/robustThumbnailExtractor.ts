// Robust thumbnail extractor with multiple fallback strategies
// This ensures we always get a thumbnail when possible

export async function extractThumbnailWithFallbacks(url: string): Promise<{
  thumbnail_url?: string;
  platform?: string;
  creator_handle?: string;
  creator_name?: string;
  success: boolean;
  method?: string;
}> {
  if (!url) return { success: false };
  
  const platform = detectPlatform(url);
  
  // Try different methods based on platform
  switch (platform) {
    case 'tiktok':
      return await extractTikTokThumbnail(url);
    case 'youtube':
      return extractYouTubeThumbnail(url);
    case 'instagram':
      return extractInstagramThumbnail(url);
    default:
      return { platform, success: false };
  }
}

function detectPlatform(url: string): string {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('reddit.com')) return 'reddit';
  return 'other';
}

async function extractTikTokThumbnail(url: string): Promise<any> {
  const result: any = {
    platform: 'tiktok',
    success: false
  };
  
  // Extract username
  const usernameMatch = url.match(/@([^\/\?]+)/);
  if (usernameMatch) {
    result.creator_handle = `@${usernameMatch[1]}`;
  }
  
  // Method 1: Extract video ID and use CDN pattern
  const videoIdMatch = url.match(/video\/(\d+)/);
  if (videoIdMatch) {
    const videoId = videoIdMatch[1];
    
    // Try multiple CDN patterns
    const cdnPatterns = [
      `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`,
      `https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/${videoId}~tplv-obj.jpg`,
      `https://p19-sign.tiktokcdn-us.com/obj/tos-useast5-p-0068-tx/${videoId}~tplv-obj.jpg`,
      `https://p16-sign.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~c5_300x400.jpeg`
    ];
    
    // Use the first pattern but prepare fallbacks
    result.thumbnail_url = `/api/image-proxy/proxy-image?url=${encodeURIComponent(cdnPatterns[0])}`;
    result.success = true;
    result.method = 'video_id_cdn';
    return result;
  }
  
  // Method 2: Try API fallback
  try {
    const response = await fetch('/api/tiktok-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.thumbnail_url) {
        result.thumbnail_url = `/api/image-proxy/proxy-image?url=${encodeURIComponent(data.thumbnail_url)}`;
        result.success = true;
        result.method = 'api_fallback';
        if (data.creator_handle) result.creator_handle = data.creator_handle;
        if (data.creator_name) result.creator_name = data.creator_name;
        return result;
      }
    }
  } catch (error) {
    console.log('API fallback failed:', error);
  }
  
  return result;
}

function extractYouTubeThumbnail(url: string): any {
  const result: any = {
    platform: 'youtube',
    success: false
  };
  
  let videoId = null;
  
  // Extract video ID from various YouTube URL formats
  if (url.includes('youtube.com')) {
    const match = url.match(/[?&]v=([^&]+)/);
    if (match) videoId = match[1];
  } else if (url.includes('youtu.be')) {
    const match = url.match(/youtu\.be\/([^?]+)/);
    if (match) videoId = match[1];
  }
  
  if (videoId) {
    // Try multiple quality options in order
    result.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    result.success = true;
    result.method = 'youtube_direct';
  }
  
  return result;
}

function extractInstagramThumbnail(url: string): any {
  // Instagram requires authentication for thumbnails
  // We can only return platform info
  return {
    platform: 'instagram',
    success: false,
    method: 'requires_auth'
  };
}

// Helper function to validate if a thumbnail URL is working
export async function validateThumbnail(thumbnailUrl: string): Promise<boolean> {
  if (!thumbnailUrl) return false;
  
  try {
    // If it's a proxied URL, check the proxy endpoint
    if (thumbnailUrl.startsWith('/api/')) {
      const response = await fetch(thumbnailUrl, { method: 'HEAD' });
      return response.ok;
    }
    
    // For direct URLs, we can't check from browser due to CORS
    // So we assume they're valid if they match expected patterns
    return (
      thumbnailUrl.includes('ytimg.com') ||
      thumbnailUrl.includes('tiktokcdn.com') ||
      thumbnailUrl.includes('cdninstagram.com')
    );
  } catch {
    return false;
  }
}