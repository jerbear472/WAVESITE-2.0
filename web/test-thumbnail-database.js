// Test thumbnail database storage and retrieval
// Run with: node test-thumbnail-database.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testThumbnailStorage() {
  console.log('\n🔍 Testing Thumbnail Storage and Retrieval');
  console.log('==========================================\n');

  // 1. Check if thumbnail_url column exists
  console.log('1. Checking if thumbnail_url column exists...');
  const { data: columns, error: columnsError } = await supabase
    .from('trend_submissions')
    .select('thumbnail_url')
    .limit(1);

  if (columnsError) {
    console.error('❌ Error checking column:', columnsError.message);
    return;
  }
  console.log('✅ thumbnail_url column exists\n');

  // 2. Check recent submissions for thumbnails
  console.log('2. Checking recent submissions for thumbnails...');
  const { data: recentTrends, error: recentError } = await supabase
    .from('trend_submissions')
    .select('id, created_at, thumbnail_url, screenshot_url, post_url, platform')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentError) {
    console.error('❌ Error fetching recent trends:', recentError.message);
    return;
  }

  console.log(`Found ${recentTrends?.length || 0} recent trends:\n`);
  
  recentTrends?.forEach((trend, index) => {
    console.log(`Trend ${index + 1}:`);
    console.log(`  ID: ${trend.id}`);
    console.log(`  Created: ${new Date(trend.created_at).toLocaleString()}`);
    console.log(`  Platform: ${trend.platform || 'Not specified'}`);
    console.log(`  Post URL: ${trend.post_url || 'None'}`);
    console.log(`  Thumbnail: ${trend.thumbnail_url ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Screenshot: ${trend.screenshot_url ? '✅ Present' : '❌ Missing'}`);
    
    if (trend.thumbnail_url) {
      console.log(`  Thumbnail URL: ${trend.thumbnail_url.substring(0, 100)}...`);
    }
    console.log('');
  });

  // 3. Count trends with and without thumbnails
  console.log('3. Counting trends with thumbnails...');
  const { count: totalCount } = await supabase
    .from('trend_submissions')
    .select('*', { count: 'exact', head: true });

  const { count: withThumbnail } = await supabase
    .from('trend_submissions')
    .select('*', { count: 'exact', head: true })
    .not('thumbnail_url', 'is', null);

  const { count: withScreenshot } = await supabase
    .from('trend_submissions')
    .select('*', { count: 'exact', head: true })
    .not('screenshot_url', 'is', null);

  console.log(`\nStatistics:`);
  console.log(`  Total trends: ${totalCount}`);
  console.log(`  With thumbnail_url: ${withThumbnail} (${((withThumbnail/totalCount)*100).toFixed(1)}%)`);
  console.log(`  With screenshot_url: ${withScreenshot} (${((withScreenshot/totalCount)*100).toFixed(1)}%)`);
  console.log(`  Without any image: ${totalCount - Math.max(withThumbnail, withScreenshot)} (${(((totalCount - Math.max(withThumbnail, withScreenshot))/totalCount)*100).toFixed(1)}%)`);

  // 4. Test inserting a trend with thumbnail
  console.log('\n4. Testing thumbnail insertion...');
  const testThumbnailUrl = 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg';
  
  // Note: This requires authentication, so we'll just show what would be inserted
  console.log('Sample insert data:');
  console.log({
    category: 'meme_format',
    description: 'Test trend with thumbnail',
    thumbnail_url: testThumbnailUrl,
    post_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    platform: 'youtube',
    status: 'submitted'
  });

  console.log('\n✅ Thumbnail database test complete!');
}

// Run the test
testThumbnailStorage().catch(console.error);