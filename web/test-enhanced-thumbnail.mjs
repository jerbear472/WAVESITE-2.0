// Test script for enhanced thumbnail extraction
import fetch from 'node-fetch';

const testUrls = [
  'https://www.tiktok.com/@zachking/video/7234567890123456789',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.instagram.com/p/ABC123XYZ/',
];

async function testApiEndpoint() {
  console.log('🧪 Testing Enhanced Thumbnail Extraction via API\n');
  
  for (const url of testUrls) {
    console.log(`\n📍 Testing: ${url}`);
    console.log('─'.repeat(50));
    
    try {
      if (url.includes('tiktok')) {
        // Test TikTok-specific endpoint
        const response = await fetch('http://localhost:3001/api/tiktok-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Thumbnail URL:', data.thumbnail_url || '❌ MISSING');
          console.log('👤 Creator:', data.creator_handle || 'Not found');
          console.log('📝 Caption:', data.post_caption || 'Not found');
          if (data.fallback_thumbnails) {
            console.log('🔄 Fallback URLs available:', data.fallback_thumbnails.length);
          }
        } else {
          console.error('❌ API Error:', response.status, response.statusText);
        }
      } else {
        console.log('ℹ️  Skipping non-TikTok URL for API test');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 API Test Complete');
}

async function testExtractionPage() {
  console.log('\n🌐 Test the extraction at: http://localhost:3001/test-extraction');
  console.log('   You can paste TikTok URLs there to test thumbnail extraction visually');
}

// Run the tests
console.log('Starting enhanced thumbnail extraction tests...\n');
await testApiEndpoint();
testExtractionPage();