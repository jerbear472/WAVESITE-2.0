// Helper to proxy images through our API to avoid CORS issues
// Especially needed for TikTok and Instagram thumbnails

export function getProxiedImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return '';
  
  // Don't proxy if it's already a data URL or blob
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }
  
  // Don't proxy YouTube images (they work fine with CORS)
  if (imageUrl.includes('ytimg.com') || imageUrl.includes('youtube.com/vi/')) {
    return imageUrl;
  }
  
  // Don't proxy if it's already proxied or a local URL
  if (imageUrl.startsWith('/api/image-proxy') || imageUrl.startsWith('/')) {
    return imageUrl;
  }
  
  // Check if we need to proxy (TikTok, Instagram, etc.)
  const needsProxy = (
    imageUrl.includes('tiktokcdn.com') ||
    imageUrl.includes('instagram.com') ||
    imageUrl.includes('fbcdn.net') ||
    imageUrl.includes('cdninstagram.com') ||
    imageUrl.includes('twitter.com') ||
    imageUrl.includes('twimg.com')
  );
  
  if (needsProxy) {
    // Encode the URL and proxy it
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  
  // Return original URL if no proxy needed
  return imageUrl;
}

// Check if an image URL needs proxying
export function needsImageProxy(imageUrl: string): boolean {
  if (!imageUrl) return false;
  
  return (
    imageUrl.includes('tiktokcdn.com') ||
    imageUrl.includes('instagram.com') ||
    imageUrl.includes('fbcdn.net') ||
    imageUrl.includes('cdninstagram.com') ||
    imageUrl.includes('twitter.com') ||
    imageUrl.includes('twimg.com')
  );
}