// Test script to verify TikTok thumbnail extraction is working

const testUrls = [
  'https://www.tiktok.com/@zachking/video/7379845235982896393',
  'https://www.tiktok.com/@mrbeast/video/7382953486677011753',
  'https://www.tiktok.com/@charlidamelio/video/7381234567890123456'
];

// Test the simple extractor
console.log('Testing simple thumbnail extraction...\n');

function getUltraSimpleThumbnail(url) {
  if (!url) return {};
  
  // TikTok - Extract video ID and generate thumbnail URL
  if (url.includes('tiktok.com')) {
    const usernameMatch = url.match(/@([^\/\?]+)/);
    const videoIdMatch = url.match(/video\/(\d+)/);
    
    // If we have a video ID, we can generate a thumbnail URL
    let thumbnailUrl = undefined;
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      // Use the CDN pattern that works most reliably
      thumbnailUrl = `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`;
    }
    
    return {
      platform: 'tiktok',
      creator_handle: usernameMatch ? `@${usernameMatch[1]}` : undefined,
      thumbnail_url: thumbnailUrl
    };
  }
  
  return {};
}

testUrls.forEach(url => {
  const result = getUltraSimpleThumbnail(url);
  console.log(`URL: ${url}`);
  console.log(`Creator: ${result.creator_handle || 'Not found'}`);
  console.log(`Thumbnail: ${result.thumbnail_url || 'Not found'}`);
  console.log('---');
});

// Test the API route
console.log('\nTesting API route...\n');

async function testApiRoute() {
  for (const url of testUrls) {
    try {
      const response = await fetch('http://localhost:3000/api/tiktok-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`URL: ${url}`);
        console.log(`API Response:`, {
          thumbnail_url: data.thumbnail_url || 'Not found',
          creator_handle: data.creator_handle || 'Not found',
          fallback_thumbnails: data.fallback_thumbnails?.length || 0
        });
        console.log('---');
      } else {
        console.log(`Failed for ${url}: ${response.status}`);
      }
    } catch (error) {
      console.log(`Error for ${url}:`, error.message);
    }
  }
}

testApiRoute().then(() => {
  console.log('\nTest complete!');
  console.log('Next steps:');
  console.log('1. Go to http://localhost:3000/submit');
  console.log('2. Paste a TikTok URL');
  console.log('3. Check browser console for thumbnail extraction logs');
  console.log('4. Verify thumbnail appears in the form');
});