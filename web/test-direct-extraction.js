// Test direct thumbnail extraction
// Run with: node test-direct-extraction.js

class DirectThumbnailExtractor {
  static extractThumbnail(url) {
    if (!url) return null;
    
    // Clean the URL first
    url = url.trim();
    
    // YouTube - most reliable
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const patterns = [
        /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          const videoId = match[1];
          // Return high quality thumbnail directly
          const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          console.log('DirectExtractor: YouTube thumbnail:', thumbnail);
          return thumbnail;
        }
      }
    }
    
    // TikTok - try to extract video ID
    if (url.includes('tiktok.com')) {
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        // Use a pattern that often works
        const thumbnail = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-noop.image`;
        console.log('DirectExtractor: TikTok thumbnail (unverified):', thumbnail);
        return thumbnail;
      }
    }
    
    // Instagram - basic pattern
    if (url.includes('instagram.com')) {
      const postIdMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);
      if (postIdMatch && postIdMatch[1]) {
        const postId = postIdMatch[1];
        // Instagram media URL pattern
        const thumbnail = `https://www.instagram.com/p/${postId}/media/?size=l`;
        console.log('DirectExtractor: Instagram thumbnail (unverified):', thumbnail);
        return thumbnail;
      }
    }
    
    return null;
  }
}

console.log('TESTING DIRECT THUMBNAIL EXTRACTION');
console.log('====================================\n');

// Test URLs from the database (the ones that failed)
const testUrls = [
  'https://www.tiktok.com/@mattmanseeknee/video/7527839913622916366?is_from_webapp=1&sender_device=pc',
  'https://www.tiktok.com/@emisspam11/video/7533993122343210270?is_from_webapp=1&sender_device=pc',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.instagram.com/p/DNL3t4bS3jN/?utm_source=ig_web_copy_link',
  'https://youtu.be/dQw4w9WgXcQ'
];

testUrls.forEach((url, index) => {
  console.log(`${index + 1}. Testing: ${url}`);
  const thumbnail = DirectThumbnailExtractor.extractThumbnail(url);
  if (thumbnail) {
    console.log(`   ✅ Extracted: ${thumbnail}`);
  } else {
    console.log('   ❌ No thumbnail extracted');
  }
  console.log('');
});

console.log('\nSUMMARY');
console.log('=======');
console.log('YouTube URLs should extract reliably');
console.log('TikTok URLs extract but may not load without proxy');
console.log('Instagram URLs extract but need authentication to load');