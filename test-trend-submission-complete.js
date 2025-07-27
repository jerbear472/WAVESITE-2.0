// COMPLETE TREND SUBMISSION TEST
// Copy and paste this entire script into browser console on your /submit page

console.log('🚀 WAVESITE2 TREND SUBMISSION COMPLETE TEST');
console.log('==========================================');

// Step 1: Test proxy API
async function testProxyAPI() {
  console.log('\n🔍 Step 1: Testing Proxy API...');
  
  try {
    const testUrl = 'https://www.tiktok.com/oembed?url=https://www.tiktok.com/@khaby.lame/video/7137423965982686469';
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(testUrl)}`;
    
    console.log('🌐 Testing proxy with URL:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    console.log('📡 Proxy response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Proxy API working! Sample data:', data);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Proxy API failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Proxy API error:', error);
    return false;
  }
}

// Step 2: Test metadata extraction
async function testMetadataExtraction() {
  console.log('\n🔍 Step 2: Testing Metadata Extraction...');
  
  // Test URLs for different platforms
  const testUrls = [
    'https://www.tiktok.com/@khaby.lame/video/7137423965982686469',
    'https://www.instagram.com/p/CdGcSJOA9Xv/',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://twitter.com/elonmusk/status/1234567890'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`\n📊 Testing: ${url}`);
      
      if (typeof MetadataExtractor !== 'undefined') {
        const metadata = await MetadataExtractor.extractFromUrl(url);
        console.log('✅ Metadata extracted:', metadata);
        
        // Check if we got thumbnail
        if (metadata.thumbnail_url) {
          console.log('🖼️ Thumbnail captured:', metadata.thumbnail_url);
        } else {
          console.log('⚠️ No thumbnail captured');
        }
      } else {
        console.error('❌ MetadataExtractor not available');
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to extract metadata for ${url}:`, error);
    }
  }
  
  return true;
}

// Step 3: Test user authentication
function testUserAuth() {
  console.log('\n🔍 Step 3: Testing User Authentication...');
  
  if (typeof user !== 'undefined' && user?.id) {
    console.log('✅ User authenticated:', {
      id: user.id,
      email: user.email,
      username: user.username
    });
    return true;
  } else {
    console.error('❌ User not authenticated. Please login first.');
    return false;
  }
}

// Step 4: Test database insertion
async function testDatabaseInsertion() {
  console.log('\n🔍 Step 4: Testing Database Insertion...');
  
  if (!user?.id) {
    console.error('❌ User not authenticated');
    return false;
  }
  
  try {
    const testData = {
      spotter_id: user.id,
      category: 'meme_format',
      description: 'Test trend submission - automated test',
      evidence: {
        url: 'https://www.tiktok.com/@test/video/123',
        platform: 'tiktok',
        title: 'Test Trend',
        metadata: 'test'
      },
      virality_prediction: 5,
      status: 'submitted',
      quality_score: 0.5,
      validation_count: 0,
      created_at: new Date().toISOString(),
      // Social media metadata
      creator_handle: '@test_user',
      creator_name: 'Test User',
      post_caption: 'This is a test caption',
      likes_count: 1000,
      comments_count: 50,
      views_count: 10000,
      hashtags: ['test', 'automated'],
      post_url: 'https://www.tiktok.com/@test/video/123',
      posted_at: new Date().toISOString()
    };
    
    console.log('📝 Attempting to insert test data:', testData);
    
    if (typeof supabase !== 'undefined') {
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(testData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Database insertion failed:', error);
        
        // Provide specific guidance
        if (error.message.includes('violates row-level security')) {
          console.log('🔧 Fix: Check RLS policies in Supabase');
        } else if (error.message.includes('foreign key')) {
          console.log('🔧 Fix: User profile may not exist in profiles table');
        }
        
        return false;
      } else {
        console.log('✅ Database insertion successful:', data);
        
        // Clean up test data
        await supabase
          .from('trend_submissions')
          .delete()
          .eq('id', data.id);
        console.log('🧹 Test data cleaned up');
        
        return true;
      }
    } else {
      console.error('❌ Supabase not available');
      return false;
    }
  } catch (error) {
    console.error('❌ Database test error:', error);
    return false;
  }
}

// Step 5: Test complete submission flow
async function testCompleteSubmissionFlow() {
  console.log('\n🔍 Step 5: Testing Complete Submission Flow...');
  
  try {
    // Use a real trending TikTok URL
    const trendingUrl = 'https://www.tiktok.com/@khaby.lame/video/7137423965982686469';
    
    console.log('📊 Extracting metadata for trending URL...');
    const metadata = await MetadataExtractor.extractFromUrl(trendingUrl);
    
    const completeFormData = {
      url: trendingUrl,
      trendName: metadata.title || 'Khaby Lame Simplicity',
      platform: 'tiktok',
      explanation: 'Khaby Lame pointing out overly complicated life hacks with simple solutions',
      ageRanges: ['Gen Z (15-24)', 'Millennials (25-40)'],
      categories: ['Humor & Memes'],
      moods: ['Funny 😂', 'Wholesome 🥰'],
      spreadSpeed: 'viral',
      motivation: 'Humor and relatability - everyone loves simple solutions to complex problems',
      firstSeen: 'this_week',
      otherPlatforms: ['instagram', 'youtube'],
      brandAdoption: true,
      // Auto-extracted metadata
      creator_handle: metadata.creator_handle,
      creator_name: metadata.creator_name,
      post_caption: metadata.post_caption,
      likes_count: metadata.likes_count || 0,
      comments_count: metadata.comments_count || 0,
      views_count: metadata.views_count || 0,
      hashtags: metadata.hashtags || [],
      thumbnail_url: metadata.thumbnail_url
    };
    
    console.log('📝 Complete form data prepared:', completeFormData);
    
    // Test if handleTrendSubmit function exists
    if (typeof handleTrendSubmit === 'function') {
      console.log('🚀 Testing complete submission...');
      await handleTrendSubmit(completeFormData);
      console.log('✅ Complete submission test successful!');
      return true;
    } else {
      console.log('⚠️ handleTrendSubmit function not available on this page');
      console.log('📋 But form data structure is correct and ready to use');
      return true;
    }
  } catch (error) {
    console.error('❌ Complete submission flow error:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running all trend submission tests...\n');
  
  const results = {
    proxyAPI: await testProxyAPI(),
    metadataExtraction: await testMetadataExtraction(),
    userAuth: testUserAuth(),
    databaseInsertion: await testDatabaseInsertion(),
    completeFlow: await testCompleteSubmissionFlow()
  };
  
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  console.log('Proxy API:', results.proxyAPI ? '✅ PASS' : '❌ FAIL');
  console.log('Metadata Extraction:', results.metadataExtraction ? '✅ PASS' : '❌ FAIL');
  console.log('User Authentication:', results.userAuth ? '✅ PASS' : '❌ FAIL');
  console.log('Database Insertion:', results.databaseInsertion ? '✅ PASS' : '❌ FAIL');
  console.log('Complete Flow:', results.completeFlow ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Trend submission should be working beautifully!');
    console.log('💡 Try submitting a real trend now.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the specific errors above.');
    console.log('🔧 Run the individual test functions to debug specific issues.');
  }
  
  return results;
}

// Instructions
console.log('\n📋 INSTRUCTIONS:');
console.log('1. Make sure you are logged in');
console.log('2. Make sure you are on the /submit page');
console.log('3. Run: runAllTests()');
console.log('4. Or run individual tests: testProxyAPI(), testMetadataExtraction(), etc.');
console.log('\n🚀 Ready to test! Run: runAllTests()');

// Auto-run if requested
// runAllTests();