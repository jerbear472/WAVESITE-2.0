const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTimelineFeature() {
  console.log('Testing Timeline Feature...\n');

  try {
    // 1. Test authentication
    console.log('1. Testing authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('❌ Not authenticated. Please log in first.');
      return;
    }
    
    console.log('✅ Authenticated as:', session.user.email);
    
    // 2. Test fetching user trends
    console.log('\n2. Fetching user trends...');
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('spotter_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (trendsError) {
      console.error('❌ Error fetching trends:', trendsError);
      return;
    }
    
    console.log(`✅ Found ${trends?.length || 0} trends`);
    
    if (trends && trends.length > 0) {
      console.log('\nSample trend data:');
      const sampleTrend = trends[0];
      console.log('- ID:', sampleTrend.id);
      console.log('- Category:', sampleTrend.category);
      console.log('- Status:', sampleTrend.status);
      console.log('- Created:', new Date(sampleTrend.created_at).toLocaleString());
      console.log('- Has thumbnail:', !!sampleTrend.thumbnail_url);
      console.log('- Has screenshot:', !!sampleTrend.screenshot_url);
    }
    
    // 3. Test timeline data transformation
    console.log('\n3. Testing timeline data transformation...');
    const timelineTrends = trends?.map(trend => {
      const title = trend.evidence?.title || 
                   trend.description.split('\n')[0].substring(0, 50) || 
                   `${trend.category} Trend`;
      
      return {
        id: trend.id,
        title,
        category: trend.category,
        status: trend.status,
        created_at: trend.created_at,
        waveScore: Math.min(100, trend.quality_score * 10 + trend.validation_count * 5),
        hasImages: !!(trend.thumbnail_url || trend.screenshot_url)
      };
    }) || [];
    
    console.log('✅ Transformed trends for timeline view');
    console.log(`   Timeline items: ${timelineTrends.length}`);
    
    // 4. Test real-time subscription
    console.log('\n4. Setting up real-time subscription...');
    const subscription = supabase
      .channel('test-timeline')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trend_submissions',
          filter: `spotter_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('📡 Real-time update received:', payload.eventType);
        }
      )
      .subscribe();
    
    console.log('✅ Real-time subscription active');
    console.log('   (Submit a new trend to see real-time updates)');
    
    // Keep the script running for a bit to test real-time
    setTimeout(() => {
      subscription.unsubscribe();
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
testTimelineFeature();