// Test live thumbnail extraction with real URLs
import fetch from 'node-fetch';

const testUrls = [
  'https://www.tiktok.com/@khaby.lame/video/7413539439406894337',
  'https://www.tiktok.com/@zachking/video/7412345678901234567',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
];

async function testExtraction(url) {
  console.log(`\n📍 Testing: ${url}`);
  console.log('─'.repeat(60));
  
  try {
    // Test via the API endpoint
    const response = await fetch('http://localhost:3001/api/tiktok-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Thumbnail URL:', data.thumbnail_url || '❌ MISSING');
      console.log('👤 Creator:', data.creator_handle || 'Not found');
      
      // Test if the thumbnail URL actually loads
      if (data.thumbnail_url) {
        try {
          const imgResponse = await fetch(data.thumbnail_url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });
          
          if (imgResponse.ok) {
            console.log('🖼️  Thumbnail is accessible!');
          } else {
            console.log('⚠️  Thumbnail URL returned status:', imgResponse.status);
          }
        } catch (imgError) {
          console.log('⚠️  Could not verify thumbnail accessibility');
        }
      }
    } else {
      console.log('❌ API Error:', response.status);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🧪 Testing Live Thumbnail Extraction\n');
  
  for (const url of testUrls) {
    if (url.includes('tiktok')) {
      await testExtraction(url);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Complete');
  console.log('\nℹ️  Visit http://localhost:3001/test-submit to test visually');
}

main();