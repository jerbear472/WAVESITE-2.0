// Fallback thumbnail generation for when external thumbnails can't be loaded

export function generateFallbackThumbnail(
  platform: string,
  username?: string,
  videoId?: string
): string {
  // Create a data URL for an SVG placeholder
  const bgColors: Record<string, string> = {
    tiktok: '#000000',
    instagram: '#E4405F',
    youtube: '#FF0000',
    twitter: '#1DA1F2',
    default: '#6B7280'
  };
  
  const bgColor = bgColors[platform] || bgColors.default;
  const displayName = username || videoId?.slice(0, 8) || platform;
  
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${bgColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#grad)"/>
      <text x="200" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">
        ${platform === 'tiktok' ? '🎵' : platform === 'instagram' ? '📸' : platform === 'youtube' ? '▶️' : '🌐'}
      </text>
      <text x="200" y="220" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.9">
        ${displayName}
      </text>
      <text x="200" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.7">
        ${platform.charAt(0).toUpperCase() + platform.slice(1)} Video
      </text>
    </svg>
  `.trim();
  
  // Convert to base64 data URL
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

// For server-side use (Node.js)
export function generateFallbackThumbnailServer(
  platform: string,
  username?: string,
  videoId?: string
): string {
  const bgColors: Record<string, string> = {
    tiktok: '#000000',
    instagram: '#E4405F',
    youtube: '#FF0000',
    twitter: '#1DA1F2',
    default: '#6B7280'
  };
  
  const bgColor = bgColors[platform] || bgColors.default;
  const displayName = username || videoId?.slice(0, 8) || platform;
  
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${bgColor};stop-opacity:0.8" /><stop offset="100%" style="stop-color:${bgColor};stop-opacity:1" /></linearGradient></defs><rect width="400" height="400" fill="url(#grad)"/><text x="200" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">${platform === 'tiktok' ? '🎵' : platform === 'instagram' ? '📸' : platform === 'youtube' ? '▶️' : '🌐'}</text><text x="200" y="220" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.9">${displayName}</text><text x="200" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.7">${platform.charAt(0).toUpperCase() + platform.slice(1)} Video</text></svg>`;
  
  // Return as data URL for server-side
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}