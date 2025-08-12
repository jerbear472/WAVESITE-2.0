// Simple client-side thumbnail extractor based on what worked in our test
export function extractThumbnailUrl(url: string): string | null {
  if (!url) return null;

  // TikTok
  if (url.includes('tiktok.com')) {
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      // Use the pattern that worked in our test
      return `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`;
    }
  }
  
  // YouTube
  else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = null;
    if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([^&]+)/);
      if (match) videoId = match[1];
    } else if (url.includes('youtu.be')) {
      const match = url.match(/youtu\.be\/([^?]+)/);
      if (match) videoId = match[1];
    }
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }
  
  // Instagram
  else if (url.includes('instagram.com')) {
    const postMatch = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (postMatch) {
      const postId = postMatch[2];
      return `https://www.instagram.com/p/${postId}/media/?size=l`;
    }
  }
  
  return null;
}

// Extract platform from URL
export function extractPlatform(url: string): string | null {
  if (!url) return null;
  
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  
  return null;
}

// Extract creator handle from URL
export function extractCreatorHandle(url: string): string | null {
  if (!url) return null;
  
  // TikTok
  if (url.includes('tiktok.com')) {
    const match = url.match(/@([^\/\?]+)/);
    if (match) return `@${match[1]}`;
  }
  
  // Instagram
  if (url.includes('instagram.com')) {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    if (match && !['p', 'reel', 'reels', 'tv'].includes(match[1])) {
      return `@${match[1]}`;
    }
  }
  
  // YouTube - extract channel name if present
  if (url.includes('youtube.com')) {
    const channelMatch = url.match(/\/(@[^\/\?]+)/);
    if (channelMatch) return channelMatch[1];
  }
  
  return null;
}