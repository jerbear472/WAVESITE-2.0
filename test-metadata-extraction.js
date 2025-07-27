// Test script to verify metadata extraction and timeline display
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testMetadataExtraction() {
  console.log('🧪 Testing metadata extraction and timeline flow...\n');

  try {
    // Sign in as test user
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }

    console.log('✅ Signed in as:', user.email);

    // Create a test trend submission with full metadata
    const testTrend = {
      spotter_id: user.id,
      category: 'viral_dance',
      description: 'New viral dance trend taking over TikTok!',
      screenshot_url: 'https://example.com/screenshot.jpg',
      thumbnail_url: 'https://example.com/thumbnail.jpg',
      evidence: { platform: 'tiktok', url: 'https://tiktok.com/@testuser/video/123' },
      virality_prediction: 8,
      status: 'submitted',
      quality_score: 0.75,
      // Social media metadata
      creator_handle: '@trendsetter',
      creator_name: 'Trend Setter Pro',
      post_caption: 'Just discovered this amazing dance! 🔥 #viral #fyp #trending #dance',
      likes_count: 125000,
      comments_count: 8500,
      shares_count: 3200,
      views_count: 1500000,
      hashtags: ['viral', 'fyp', 'trending', 'dance'],
      post_url: 'https://tiktok.com/@trendsetter/video/123456',
      posted_at: new Date().toISOString()
    };

    // Insert the test trend
    const { data: insertedTrend, error: insertError } = await supabase
      .from('trend_submissions')
      .insert(testTrend)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return;
    }

    console.log('✅ Trend submitted with ID:', insertedTrend.id);
    console.log('📊 Metadata included:');
    console.log('  - Creator:', insertedTrend.creator_handle, `(${insertedTrend.creator_name})`);
    console.log('  - Caption:', insertedTrend.post_caption?.substring(0, 50) + '...');
    console.log('  - Stats:', {
      likes: insertedTrend.likes_count,
      comments: insertedTrend.comments_count,
      shares: insertedTrend.shares_count,
      views: insertedTrend.views_count
    });
    console.log('  - Hashtags:', insertedTrend.hashtags);

    // Fetch user's timeline
    const { data: timeline, error: timelineError } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('spotter_id', user.id)
      .order('created_at', { ascending: false });

    if (timelineError) {
      console.error('❌ Timeline error:', timelineError);
      return;
    }

    console.log('\n📱 Timeline Results:');
    console.log(`Found ${timeline.length} trends for user`);
    
    const latestTrend = timeline[0];
    if (latestTrend) {
      console.log('\nLatest trend details:');
      console.log('- Title:', latestTrend.category);
      console.log('- Creator:', latestTrend.creator_handle);
      console.log('- Engagement:', {
        '❤️': latestTrend.likes_count?.toLocaleString(),
        '💬': latestTrend.comments_count?.toLocaleString(),
        '🔄': latestTrend.shares_count?.toLocaleString(),
        '👁️': latestTrend.views_count?.toLocaleString()
      });
    }

    // Clean up - delete test trend
    const { error: deleteError } = await supabase
      .from('trend_submissions')
      .delete()
      .eq('id', insertedTrend.id);

    if (deleteError) {
      console.error('❌ Cleanup error:', deleteError);
    } else {
      console.log('\n🧹 Test trend cleaned up successfully');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    // Sign out
    await supabase.auth.signOut();
    console.log('\n👋 Test completed');
  }
}

// Run the test
testMetadataExtraction();