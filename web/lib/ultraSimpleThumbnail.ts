// Ultra simple, synchronous thumbnail extractor
// Just returns URLs that work, no async, no complexity

export function getUltraSimpleThumbnail(url: string): { thumbnail_url?: string; platform?: string; creator_handle?: string } {
  if (!url) return {};
  
  // TikTok - don't try to get thumbnails, they're unreliable
  if (url.includes('tiktok.com')) {
    const usernameMatch = url.match(/@([^\/\?]+)/);
    
    return {
      platform: 'tiktok',
      creator_handle: usernameMatch ? `@${usernameMatch[1]}` : undefined
      // No thumbnail_url - TikTok CDN is too restrictive
    };
  }
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = null;
    if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([^&]+)/);
      if (match) videoId = match[1];
    } else if (url.includes('youtu.be')) {
      const match = url.match(/youtu\.be\/([^?]+)/);
      if (match) videoId = match[1];
    }
    
    return {
      platform: 'youtube',
      thumbnail_url: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined
    };
  }
  
  // Instagram
  if (url.includes('instagram.com')) {
    return {
      platform: 'instagram'
      // No thumbnail for Instagram without auth
    };
  }
  
  return {
    platform: 'other'
  };
}