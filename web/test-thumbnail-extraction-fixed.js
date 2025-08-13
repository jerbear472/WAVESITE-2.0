// Test script for the fixed thumbnail extraction
// Run with: node test-thumbnail-extraction-fixed.js

const testUrls = [
  'https://www.tiktok.com/@username/video/7123456789012345678',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.instagram.com/p/ABC123/',
];

// Simulate the extraction logic
function extractThumbnail(url) {
  const result = {
    url: url,
    platform: null,
    thumbnail_url: null,
    method: null,
    success: false
  };
  
  // Detect platform
  if (url.includes('tiktok.com')) {
    result.platform = 'tiktok';
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      result.thumbnail_url = `/api/image-proxy/proxy-image?url=${encodeURIComponent(`https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`)}`;
      result.method = 'video_id_cdn';
      result.success = true;
    }
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    result.platform = 'youtube';
    let videoId = null;
    if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([^&]+)/);
      if (match) videoId = match[1];
    } else if (url.includes('youtu.be')) {
      const match = url.match(/youtu\.be\/([^?]+)/);
      if (match) videoId = match[1];
    }
    if (videoId) {
      result.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      result.method = 'youtube_direct';
      result.success = true;
    }
  } else if (url.includes('instagram.com')) {
    result.platform = 'instagram';
    result.method = 'requires_auth';
    result.success = false;
  }
  
  return result;
}

console.log('Testing Thumbnail Extraction - Fixed Version');
console.log('=' .repeat(50));

testUrls.forEach(url => {
  const result = extractThumbnail(url);
  console.log('\nURL:', url);
  console.log('Platform:', result.platform);
  console.log('Success:', result.success);
  console.log('Method:', result.method);
  if (result.thumbnail_url) {
    console.log('Thumbnail:', result.thumbnail_url.substring(0, 100) + '...');
  }
});

console.log('\n' + '=' .repeat(50));
console.log('Summary:');
console.log('- TikTok: Extracts video ID and uses CDN pattern with proxy');
console.log('- YouTube: Extracts video ID and uses direct thumbnail URL');
console.log('- Instagram: Requires authentication (no thumbnail)');
console.log('\nProxy endpoint: /api/image-proxy/proxy-image');