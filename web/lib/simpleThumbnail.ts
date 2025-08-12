// Dead simple thumbnail extractor - just the patterns that work
export function getSimpleThumbnail(url: string): string | null {
  if (!url) return null;

  // YouTube - always works
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = null;
    if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([^&]+)/);
      if (match) videoId = match[1];
    } else if (url.includes('youtu.be')) {
      const match = url.match(/youtu\.be\/([^?]+)/);
      if (match) videoId = match[1];
    }
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }

  // TikTok - use the exact pattern that worked in our test
  if (url.includes('tiktok.com')) {
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      // This exact pattern worked in our local test
      return `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`;
    }
  }

  // Instagram - also unreliable without auth
  if (url.includes('instagram.com')) {
    return null;
  }

  return null;
}

// Get platform name from URL
export function getPlatformFromUrl(url: string): string {
  if (!url) return 'other';
  
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  
  return 'other';
}

// Get creator handle from URL
export function getCreatorFromUrl(url: string): string | null {
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
  
  return null;
}