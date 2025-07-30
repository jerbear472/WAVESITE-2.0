// Quick fix for user ID mismatch issue
// Run this in the browser console on the timeline page

async function fixUserMismatch() {
  console.log('🔧 Checking for user ID mismatch...\n');
  
  try {
    const { createClient } = await import('/utils/supabase/client.js');
    const supabase = createClient();
    
    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }
    
    console.log('📌 Current auth user ID:', user.id);
    console.log('📧 Email:', user.email);
    
    // Check recent submissions
    console.log('\n🔍 Checking recent submissions...');
    const { data: recentSubmissions, error: recentError } = await supabase
      .from('trend_submissions')
      .select('id, spotter_id, description, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentSubmissions && recentSubmissions.length > 0) {
      console.log(`\n📊 Found ${recentSubmissions.length} recent submissions`);
      
      // Group by spotter_id
      const spotterIds = [...new Set(recentSubmissions.map(s => s.spotter_id))];
      console.log('🆔 Unique spotter IDs:', spotterIds);
      
      // Check if any match current user
      const userSubmissions = recentSubmissions.filter(s => s.spotter_id === user.id);
      console.log(`\n✅ Submissions with your ID: ${userSubmissions.length}`);
      
      if (userSubmissions.length === 0 && recentSubmissions.length > 0) {
        console.log('\n⚠️ PROBLEM DETECTED: Your recent submissions have a different spotter_id!');
        console.log('📋 Recent submission spotter_ids:', spotterIds);
        console.log('👤 Your auth ID:', user.id);
        
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (!profile) {
          console.log('\n🚨 CRITICAL: No profile exists for your auth user!');
          console.log('💡 Creating profile now...');
          
          // Create profile
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              username: user.email.split('@')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (createError) {
            console.error('❌ Failed to create profile:', createError);
          } else {
            console.log('✅ Profile created successfully!');
          }
        }
      } else {
        console.log('\n✅ No ID mismatch detected');
      }
    }
    
    // Force refresh the timeline
    console.log('\n🔄 Forcing timeline refresh...');
    
    // Method 1: Click refresh button
    const refreshBtn = document.querySelector('[aria-label="Refresh"]');
    if (refreshBtn) {
      refreshBtn.click();
      console.log('✅ Clicked refresh button');
    }
    
    // Method 2: Call the fetch function directly
    if (window.fetchUserTrends) {
      await window.fetchUserTrends();
      console.log('✅ Called fetchUserTrends directly');
    }
    
    // Method 3: Reload the page
    console.log('\n💡 If trends still don\'t appear, try:');
    console.log('1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
    console.log('2. Clear site data and re-login');
    console.log('3. Run: window.location.reload(true)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Auto-run
fixUserMismatch();

// Also provide manual commands
window.forceRefresh = () => window.location.reload(true);
window.clearAndReload = async () => {
  const { createClient } = await import('/utils/supabase/client.js');
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/login';
};