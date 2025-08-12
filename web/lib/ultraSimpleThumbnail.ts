// Ultra simple, synchronous thumbnail extractor
// Just returns URLs that work, no async, no complexity

export function getUltraSimpleThumbnail(url: string): { thumbnail_url?: string; platform?: string; creator_handle?: string } {
  if (!url) return {};
  
  // TikTok - Extract video ID and return proxied thumbnail URL
  if (url.includes('tiktok.com')) {
    const usernameMatch = url.match(/@([^\/\?]+)/);
    const videoIdMatch = url.match(/video\/(\d+)/);
    
    // If we have a video ID, generate a proxied thumbnail URL
    let thumbnailUrl = undefined;
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      // Generate the CDN URL and proxy it to avoid CORS issues
      const cdnUrl = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`;
      thumbnailUrl = `/api/image-proxy?url=${encodeURIComponent(cdnUrl)}`;
    }
    
    return {
      platform: 'tiktok',
      creator_handle: usernameMatch ? `@${usernameMatch[1]}` : undefined,
      thumbnail_url: thumbnailUrl
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