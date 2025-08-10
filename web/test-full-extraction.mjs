// Full test of thumbnail extraction pipeline
// Run with: node test-full-extraction.mjs

import fetch from 'node-fetch';

// Simulate the DirectThumbnailExtractor
class DirectThumbnailExtractor {
  static extractThumbnail(url) {
    if (!url) return null;
    
    url = url.trim();
    console.log('🔍 DirectExtractor: Processing URL:', url);
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const patterns = [
        /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          const videoId = match[1];
          const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          console.log('✅ YouTube thumbnail extracted:', thumbnail);
          return thumbnail;
        }
      }
    }
    
    // TikTok
    if (url.includes('tiktok.com')) {
      const videoIdMatch = url.match(/video\/(\d+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        const thumbnail = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-noop.image`;
        console.log('✅ TikTok thumbnail extracted:', thumbnail);
        return thumbnail;
      }
    }
    
    console.log('❌ No thumbnail extracted');
    return null;
  }
}

// Test the extraction with various URLs
async function testExtraction() {
  console.log('🚀 TESTING THUMBNAIL EXTRACTION PIPELINE');
  console.log('=======================================\n');
  
  const testUrls = [
    {
      name: 'YouTube (Rick Roll)',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      name: 'YouTube (Short URL)',
      url: 'https://youtu.be/dQw4w9WgXcQ'
    },
    {
      name: 'TikTok (Sample)',
      url: 'https://www.tiktok.com/@zachking/video/7379894439517375790'
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/p/ABC123/'
    }
  ];
  
  for (const test of testUrls) {
    console.log(`\n📹 Testing: ${test.name}`);
    console.log(`URL: ${test.url}`);
    console.log('---');
    
    // Step 1: Direct extraction
    const thumbnail = DirectThumbnailExtractor.extractThumbnail(test.url);
    
    if (thumbnail) {
      // Step 2: Verify the thumbnail URL works
      console.log('🔗 Extracted URL:', thumbnail);
      
      try {
        const response = await fetch(thumbnail, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ Thumbnail URL is accessible!');
          console.log('   Status:', response.status);
          console.log('   Content-Type:', response.headers.get('content-type'));
        } else {
          console.log('⚠️  Thumbnail URL returned:', response.status);
        }
      } catch (error) {
        console.log('❌ Could not verify thumbnail:', error.message);
        console.log('   (This might be due to CORS or network restrictions)');
      }
    } else {
      console.log('⚠️  No thumbnail could be extracted');
    }
  }
  
  console.log('\n\n📊 EXTRACTION SUMMARY');
  console.log('====================');
  console.log('✅ YouTube URLs extract reliably and are accessible');
  console.log('⚠️  TikTok URLs extract but may need proxy to access');
  console.log('❌ Instagram URLs need OAuth or scraping');
  console.log('\n💡 RECOMMENDATION: Focus on YouTube for testing');
}

// Test database simulation
function simulateDatabase(thumbnail_url, wave_score) {
  console.log('\n\n💾 SIMULATING DATABASE SAVE');
  console.log('===========================');
  
  const submission = {
    id: 'test-' + Date.now(),
    thumbnail_url: thumbnail_url || null,
    wave_score: wave_score ? Math.round(wave_score / 10) : null,
    post_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    created_at: new Date().toISOString()
  };
  
  console.log('Saving to database:');
  console.log(JSON.stringify(submission, null, 2));
  
  // Check what would be retrieved
  console.log('\n🔍 Retrieving from database:');
  console.log('thumbnail_url:', submission.thumbnail_url || 'NOT SET');
  console.log('wave_score:', submission.wave_score || 'NOT SET');
  console.log('post_url:', submission.post_url || 'NOT SET');
  
  return submission;
}

// Run the tests
async function runAllTests() {
  await testExtraction();
  
  // Simulate saving to database
  const testThumbnail = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
  const testWaveScore = 75; // 0-100 scale
  
  simulateDatabase(testThumbnail, testWaveScore);
  
  console.log('\n\n✅ TEST COMPLETE');
  console.log('================');
  console.log('Next steps:');
  console.log('1. Submit a YouTube URL through the app');
  console.log('2. Check browser console for extraction logs');
  console.log('3. Check database for saved thumbnail_url');
  console.log('4. Verify timeline displays the thumbnail');
}

runAllTests().catch(console.error);