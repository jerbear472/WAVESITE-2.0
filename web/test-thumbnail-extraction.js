// Test script for thumbnail extraction
// Run with: node test-thumbnail-extraction.js

const TEST_URLS = [
  {
    platform: 'TikTok',
    url: 'https://www.tiktok.com/@username/video/1234567890',
    expected: 'Should extract thumbnail from video ID'
  },
  {
    platform: 'YouTube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    expected: 'Should get YouTube thumbnail easily'
  },
  {
    platform: 'YouTube Short',
    url: 'https://youtu.be/dQw4w9WgXcQ',
    expected: 'Should handle short YouTube URLs'
  },
  {
    platform: 'Instagram',
    url: 'https://www.instagram.com/p/ABC123/',
    expected: 'Should attempt Instagram media URL'
  },
  {
    platform: 'Twitter/X',
    url: 'https://twitter.com/user/status/123456789',
    expected: 'May not get thumbnail without API'
  }
];

async function testThumbnailExtraction() {
  console.log('THUMBNAIL EXTRACTION TEST');
  console.log('=========================\n');
  
  for (const test of TEST_URLS) {
    console.log(`Testing ${test.platform}:`);
    console.log(`URL: ${test.url}`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      // Test direct pattern extraction
      const videoIdMatch = test.url.match(/video\/(\d+)|v=([a-zA-Z0-9_-]{11})|youtu\.be\/([a-zA-Z0-9_-]{11})|\/p\/([A-Za-z0-9_-]+)/);
      
      if (videoIdMatch) {
        const id = videoIdMatch[1] || videoIdMatch[2] || videoIdMatch[3] || videoIdMatch[4];
        console.log(`✅ Extracted ID: ${id}`);
        
        // Generate thumbnail URL based on platform
        if (test.platform.includes('YouTube')) {
          const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
          console.log(`   Thumbnail: ${thumbnail}`);
        } else if (test.platform === 'TikTok') {
          const thumbnail = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${id}~tplv-noop.image`;
          console.log(`   Thumbnail: ${thumbnail}`);
        } else if (test.platform === 'Instagram') {
          const thumbnail = `https://www.instagram.com/p/${id}/media/?size=l`;
          console.log(`   Thumbnail: ${thumbnail}`);
        }
      } else {
        console.log(`⚠️  Could not extract ID`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('---\n');
  }
  
  console.log('\nRECOMMENDATIONS:');
  console.log('1. YouTube thumbnails are most reliable');
  console.log('2. TikTok requires trying multiple CDN patterns');
  console.log('3. Instagram needs API or web scraping');
  console.log('4. Consider adding a manual thumbnail upload option');
  console.log('5. Implement a screenshot service as fallback');
}

// Test with actual fetch if running in Node with fetch support
async function testActualFetch() {
  console.log('\n\nTESTING ACTUAL THUMBNAIL URLS');
  console.log('==============================\n');
  
  const realUrls = [
    {
      name: 'YouTube (Rick Roll)',
      url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    },
    {
      name: 'YouTube (maxres)',
      url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
    }
  ];
  
  for (const test of realUrls) {
    try {
      const response = await fetch(test.url, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ ${test.name}: Working!`);
        console.log(`   URL: ${test.url}`);
      } else {
        console.log(`❌ ${test.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

// Run tests
testThumbnailExtraction();

// Only run fetch test if fetch is available (Node 18+)
if (typeof fetch !== 'undefined') {
  testActualFetch().catch(console.error);
} else {
  console.log('\n(Skipping actual fetch test - fetch not available)');
}