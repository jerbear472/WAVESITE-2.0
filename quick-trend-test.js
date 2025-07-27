// Quick test for trend submission functionality
// Run this in browser console on localhost:3001/submit while logged in

async function quickTrendTest() {
  console.log('🚀 Quick Trend Submission Test');
  console.log('===============================');
  
  // Test 1: Check if MetadataExtractor is available
  console.log('\n1. Testing MetadataExtractor availability...');
  if (typeof MetadataExtractor === 'undefined') {
    console.error('❌ MetadataExtractor not found - check if metadataExtractor.ts is imported');
    return false;
  }
  console.log('✅ MetadataExtractor available');
  
  // Test 2: Test metadata extraction with a TikTok URL
  console.log('\n2. Testing metadata extraction...');
  const testUrl = 'https://www.tiktok.com/@khaby.lame/video/7137423965982686469';
  
  try {
    const metadata = await MetadataExtractor.extractFromUrl(testUrl);
    console.log('✅ Metadata extracted:', metadata);
    
    if (metadata.thumbnail_url) {
      console.log('🖼️ Thumbnail captured!');
    } else {
      console.log('⚠️ No thumbnail captured');
    }
    
    if (metadata.creator_handle) {
      console.log('👤 Creator handle captured:', metadata.creator_handle);
    }
    
    return metadata;
  } catch (error) {
    console.error('❌ Metadata extraction failed:', error);
    return false;
  }
}

// Test 3: Test proxy API directly
async function testProxy() {
  console.log('\n3. Testing proxy API...');
  
  const testUrl = 'https://www.tiktok.com/oembed?url=https://www.tiktok.com/@khaby.lame/video/7137423965982686469';
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(testUrl)}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Proxy API working:', data);
      return true;
    } else {
      console.error('❌ Proxy API failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Proxy API error:', error);
    return false;
  }
}

// Run all tests
async function runQuickTest() {
  console.log('Starting quick trend submission test...\n');
  
  const proxyResult = await testProxy();
  const metadataResult = await quickTrendTest();
  
  console.log('\n📊 QUICK TEST RESULTS:');
  console.log('Proxy API:', proxyResult ? '✅ WORKING' : '❌ FAILED');
  console.log('Metadata Extraction:', metadataResult ? '✅ WORKING' : '❌ FAILED');
  
  if (proxyResult && metadataResult) {
    console.log('\n🎉 SUCCESS! Trend submission should work!');
    console.log('💡 Now try submitting a real trend on the form.');
  } else {
    console.log('\n⚠️ Issues detected. Check the errors above.');
  }
  
  return { proxyResult, metadataResult };
}

// Auto-run
console.log('🔧 Quick Trend Test loaded. Run: runQuickTest()');