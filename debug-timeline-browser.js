// Browser console script to debug timeline issues
// Run this on the timeline page

async function debugTimeline() {
  console.log('🔍 Debugging Timeline Issues...\n');
  
  try {
    // 1. Check authentication
    const { createClient } = await import('/utils/supabase/client.js');
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return;
    }
    
    console.log('✅ Authenticated as:', user.email);
    console.log('👤 User ID:', user.id);
    
    // 2. Check profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile error:', profileError);
      console.log('⚠️ This might be the issue - no profile for this user!');
    } else {
      console.log('✅ Profile found:', profile);
    }
    
    // 3. Try direct query for trends
    console.log('\n📊 Querying trend_submissions...');
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('spotter_id', user.id)
      .order('created_at', { ascending: false });
    
    if (trendsError) {
      console.error('❌ Query error:', trendsError);
      console.log('💡 This suggests an RLS policy issue');
    } else {
      console.log(`✅ Found ${trends?.length || 0} trends for your user`);
      if (trends && trends.length > 0) {
        console.log('📋 Latest trend:', trends[0]);
      }
    }
    
    // 4. Check ALL trends (might fail due to RLS)
    console.log('\n🌍 Checking all recent trends...');
    const { data: allTrends, error: allError } = await supabase
      .from('trend_submissions')
      .select('id, spotter_id, created_at, description')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.log('⚠️ Cannot see all trends (expected due to RLS)');
    } else {
      console.log(`📊 Total recent trends visible: ${allTrends?.length || 0}`);
      
      // Check if any belong to current user
      const myTrends = allTrends?.filter(t => t.spotter_id === user.id) || [];
      console.log(`📌 Your trends in recent list: ${myTrends.length}`);
    }
    
    // 5. Test inserting a trend
    console.log('\n🧪 Testing direct insertion...');
    const testTrend = {
      spotter_id: user.id,
      category: 'meme_format',
      description: `Debug test at ${new Date().toISOString()}`,
      platform: 'other',
      status: 'submitted',
      post_url: 'https://example.com/debug-test',
      evidence: { debug: true },
      created_at: new Date().toISOString()
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('trend_submissions')
      .insert(testTrend)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
    } else {
      console.log('✅ Test trend inserted:', inserted.id);
      
      // Try to fetch it back
      const { data: fetched, error: fetchError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('id', inserted.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Cannot fetch back the inserted trend!', fetchError);
        console.log('🚨 This confirms an RLS SELECT policy issue');
      } else {
        console.log('✅ Can fetch back the trend:', fetched.id);
      }
      
      // Clean up
      await supabase
        .from('trend_submissions')
        .delete()
        .eq('id', inserted.id);
      console.log('🧹 Test trend cleaned up');
    }
    
    // 6. Check React component state
    console.log('\n⚛️ Checking React component...');
    const timelineElement = document.querySelector('[data-testid="timeline-container"]');
    if (timelineElement && timelineElement.__reactInternalInstance) {
      console.log('✅ Found Timeline React component');
    } else {
      console.log('⚠️ Could not find Timeline React component');
    }
    
    // 7. Summary
    console.log('\n📝 SUMMARY:');
    console.log('==========');
    if (!profile) {
      console.log('🚨 CRITICAL: No profile exists for this user');
      console.log('💡 Fix: Run the profile creation SQL script');
    } else if (trendsError) {
      console.log('🚨 CRITICAL: Cannot query trends due to RLS policies');
      console.log('💡 Fix: Update RLS policies to allow users to see their own trends');
    } else if (trends && trends.length === 0) {
      console.log('⚠️ No trends found but query works');
      console.log('💡 Check if submissions are using the correct user ID');
    } else {
      console.log('✅ Everything seems to be working');
      console.log(`📊 You have ${trends.length} trends`);
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugTimeline();

// Also provide a function to manually refresh
window.refreshTimeline = async function() {
  console.log('🔄 Manually refreshing timeline...');
  
  // Find and click the refresh button if it exists
  const refreshButton = document.querySelector('[data-testid="refresh-button"]');
  if (refreshButton) {
    refreshButton.click();
    console.log('✅ Clicked refresh button');
  } else {
    // Force reload the page
    window.location.reload();
  }
};