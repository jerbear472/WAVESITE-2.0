// Test script for thumbnail extraction
// Run with: node test-thumbnail-extraction.js

async function testThumbnailExtraction() {
  const testUrls = [
    'https://www.tiktok.com/@username/video/7234567890123456789',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.instagram.com/p/ABC123/',
  ];

  for (const url of testUrls) {
    console.log('\n=====================================');
    console.log('Testing URL:', url);
    console.log('=====================================');
    
    // Test direct pattern extraction
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      console.log('Video ID extracted:', videoId);
      
      const thumbnailPatterns = [
        `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037/${videoId}~tplv-dmt-logom:tos-alisg-i-0000/${videoId}.image`,
        `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}`,
        `https://p16-sign.tiktokcdn.com/${videoId}~c5_720x720.jpeg`,
      ];
      
      console.log('Generated thumbnail URLs:');
      thumbnailPatterns.forEach((pattern, i) => {
        console.log(`  ${i + 1}. ${pattern}`);
      });
    }
    
    // Test YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        const videoId = match[1];
        console.log('YouTube Video ID:', videoId);
        console.log('Thumbnail URL:', `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
      }
    }
    
    // Test Instagram
    if (url.includes('instagram.com')) {
      const postIdMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);
      if (postIdMatch) {
        const postId = postIdMatch[1];
        console.log('Instagram Post ID:', postId);
        console.log('Thumbnail URL:', `https://www.instagram.com/p/${postId}/media/?size=l`);
      }
    }
  }
}

// Test oEmbed endpoints
async function testOEmbedEndpoints() {
  console.log('\n\n🔍 Testing oEmbed Endpoints');
  console.log('=====================================');
  
  const testUrls = [
    {
      platform: 'TikTok',
      url: 'https://www.tiktok.com/@zachking/video/7234567890123456789',
      oembedUrl: 'https://www.tiktok.com/oembed?url=https://www.tiktok.com/@zachking/video/7234567890123456789'
    },
    {
      platform: 'YouTube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      oembedUrl: 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&format=json'
    }
  ];
  
  for (const test of testUrls) {
    console.log(`\n${test.platform} oEmbed:`);
    console.log('URL:', test.oembedUrl);
    
    try {
      const response = await fetch(test.oembedUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response received');
        console.log('Thumbnail:', data.thumbnail_url || 'Not found');
        console.log('Author:', data.author_name || 'Not found');
        console.log('Title:', data.title ? data.title.substring(0, 50) + '...' : 'Not found');
      } else {
        console.log('❌ Failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

// Run tests
console.log('🧪 Thumbnail Extraction Test Suite');
console.log('===================================\n');

testThumbnailExtraction();

// Note: oEmbed tests require network access
// Uncomment to test:
// testOEmbedEndpoints().catch(console.error);