// Test script to verify and fix thumbnail extraction
import { VercelSafeMetadataExtractor } from './lib/vercelSafeMetadataExtractor.js';

const testUrls = [
  'https://www.tiktok.com/@zachking/video/7234567890123456789',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.instagram.com/p/ABC123/',
];

async function testThumbnailExtraction() {
  console.log('🧪 Testing Thumbnail Extraction\n');
  
  for (const url of testUrls) {
    console.log(`\n📍 Testing: ${url}`);
    console.log('─'.repeat(50));
    
    try {
      const metadata = await VercelSafeMetadataExtractor.extractFromUrl(url);
      
      console.log('✅ Platform:', metadata.platform);
      console.log('🖼️  Thumbnail URL:', metadata.thumbnail_url || '❌ MISSING');
      console.log('👤 Creator:', metadata.creator_handle || 'Not found');
      
      if (!metadata.thumbnail_url) {
        console.log('⚠️  WARNING: No thumbnail extracted for', metadata.platform);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Complete');
}

// Run the test
testThumbnailExtraction();