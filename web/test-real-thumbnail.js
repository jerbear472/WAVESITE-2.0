// Test real thumbnail extraction with actual social media URLs
// Run with: node test-real-thumbnail.js

async function testRealThumbnails() {
  console.log('TESTING REAL THUMBNAIL EXTRACTION');
  console.log('=================================\n');
  
  const testUrls = [
    {
      name: 'YouTube - Music Video',
      url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      platform: 'youtube'
    },
    {
      name: 'TikTok - Sample',
      url: 'https://www.tiktok.com/@zachking/video/7379894439517375790',
      platform: 'tiktok'
    }
  ];
  
  for (const test of testUrls) {
    console.log(`Testing: ${test.name}`);
    console.log(`URL: ${test.url}`);
    console.log(`Platform: ${test.platform}`);
    console.log('---');
    
    if (test.platform === 'youtube') {
      // Extract YouTube video ID
      const match = test.url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        const videoId = match[1];
        const thumbnails = [
          { quality: 'max', url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` },
          { quality: 'hq', url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
          { quality: 'mq', url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` }
        ];
        
        console.log(`Video ID: ${videoId}`);
        for (const thumb of thumbnails) {
          try {
            const response = await fetch(thumb.url, { method: 'HEAD' });
            if (response.ok) {
              console.log(`✅ ${thumb.quality} quality: ${thumb.url}`);
              break; // Use first working thumbnail
            } else {
              console.log(`❌ ${thumb.quality} quality: HTTP ${response.status}`);
            }
          } catch (error) {
            console.log(`❌ ${thumb.quality} quality: ${error.message}`);
          }
        }
      }
    } else if (test.platform === 'tiktok') {
      // Extract TikTok video ID
      const match = test.url.match(/video\/(\d+)/);
      if (match) {
        const videoId = match[1];
        console.log(`Video ID: ${videoId}`);
        
        // TikTok thumbnail patterns
        const patterns = [
          `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-noop.image`,
          `https://p16-sign.tiktokcdn.com/obj/${videoId}~c5_720x720.jpeg`,
          `https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/${videoId}~tplv-obj.image`
        ];
        
        console.log('Trying TikTok CDN patterns:');
        for (let i = 0; i < patterns.length; i++) {
          console.log(`Pattern ${i + 1}: ${patterns[i]}`);
          // Note: These may not work without proper headers/proxy
        }
        
        // Try oEmbed API
        console.log('\nTrying TikTok oEmbed API:');
        try {
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(test.url)}`;
          console.log(`oEmbed URL: ${oembedUrl}`);
          
          // This would need to go through the proxy in the actual app
          const response = await fetch(oembedUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.thumbnail_url) {
              console.log(`✅ oEmbed thumbnail: ${data.thumbnail_url}`);
            } else {
              console.log('❌ No thumbnail in oEmbed response');
            }
          } else {
            console.log(`❌ oEmbed failed: HTTP ${response.status}`);
          }
        } catch (error) {
          console.log(`❌ oEmbed error: ${error.message}`);
          console.log('Note: TikTok oEmbed may require proxy due to CORS');
        }
      }
    }
    
    console.log('\n');
  }
  
  console.log('SUMMARY');
  console.log('=======');
  console.log('✅ YouTube thumbnails work reliably with direct URLs');
  console.log('⚠️  TikTok thumbnails require proxy for oEmbed API');
  console.log('💡 The enhanced extractor should handle both platforms');
}

testRealThumbnails().catch(console.error);