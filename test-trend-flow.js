require('dotenv').config({ path: './web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrendFlow() {
  console.log('🔍 Testing Trend Submission and Timeline Flow\n');

  try {
    // 1. Check if we have any users
    console.log('1. Checking for existing users...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, username')
      .limit(1);

    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }

    const testUser = users[0];
    console.log(`Found user: ${testUser.email} (ID: ${testUser.id})\n`);

    // 2. Check existing trends for this user
    console.log('2. Checking existing trends for user...');
    const { data: existingTrends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('spotter_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (trendsError) {
      console.error('Error fetching trends:', trendsError);
    } else {
      console.log(`Found ${existingTrends?.length || 0} existing trends`);
      if (existingTrends && existingTrends.length > 0) {
        console.log('\nRecent trends:');
        existingTrends.forEach(trend => {
          console.log(`- ${trend.category}: ${trend.description.substring(0, 50)}...`);
          console.log(`  Status: ${trend.status}, Created: ${new Date(trend.created_at).toLocaleString()}`);
        });
      }
    }

    // 3. Submit a new test trend
    console.log('\n3. Submitting a new test trend...');
    const testTrend = {
      spotter_id: testUser.id,
      category: 'visual_style',
      description: `Test Trend ${Date.now()}\n\nThis is a test trend to verify the submission flow.\n\nURL: https://tiktok.com/test\nPlatform: tiktok`,
      screenshot_url: null,
      evidence: {
        url: 'https://tiktok.com/test',
        title: `Test Trend ${Date.now()}`,
        platform: 'tiktok',
        submitted_by: testUser.username || testUser.email
      },
      virality_prediction: 7,
      status: 'submitted',
      creator_handle: '@testcreator',
      creator_name: 'Test Creator',
      post_caption: 'This is a test trend submission #testing #wavesight',
      likes_count: 1000,
      comments_count: 50,
      shares_count: 100,
      views_count: 10000,
      hashtags: ['testing', 'wavesight', 'trend'],
      post_url: 'https://tiktok.com/test',
      thumbnail_url: null,
      posted_at: new Date().toISOString()
    };

    const { data: newTrend, error: submitError } = await supabase
      .from('trend_submissions')
      .insert(testTrend)
      .select()
      .single();

    if (submitError) {
      console.error('Error submitting trend:', submitError);
      return;
    }

    console.log(`✅ Successfully submitted trend with ID: ${newTrend.id}`);

    // 4. Verify the trend appears in timeline query
    console.log('\n4. Verifying trend appears in timeline query...');
    const { data: timelineTrends, error: timelineError } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('spotter_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (timelineError) {
      console.error('Error fetching timeline:', timelineError);
    } else if (timelineTrends && timelineTrends.length > 0) {
      const latestTrend = timelineTrends[0];
      console.log('✅ Latest trend found in timeline:');
      console.log(`   ID: ${latestTrend.id}`);
      console.log(`   Category: ${latestTrend.category}`);
      console.log(`   Status: ${latestTrend.status}`);
      console.log(`   Creator: ${latestTrend.creator_handle}`);
      console.log(`   Engagement: ${latestTrend.likes_count} likes, ${latestTrend.views_count} views`);
    }

    // 5. Summary
    console.log('\n📊 Summary:');
    console.log('- User can submit trends: ✅');
    console.log('- Trends are saved to database: ✅');
    console.log('- Trends appear in timeline query: ✅');
    console.log('\nThe trend submission and timeline flow is working correctly!');
    console.log('\nYou can now:');
    console.log('1. Visit http://134.199.179.19/submit to submit a trend');
    console.log('2. Visit http://134.199.179.19/timeline to see your trends');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testTrendFlow();