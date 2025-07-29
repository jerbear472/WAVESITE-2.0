// Debug script to fix trend submission hanging
// Run this in the browser console to add better error handling

// Override the handleTrendSubmit function with better logging and timeouts
(function() {
  console.log('🔧 Applying trend submission fix...');
  
  // Find the React component instance
  const timelineComponent = document.querySelector('[data-timeline]')?.__reactInternalInstance;
  
  if (!timelineComponent) {
    console.log('⚠️ Could not find Timeline component. Try this on the timeline page.');
    return;
  }
  
  // Patch the submission handler
  const originalSubmit = window.handleTrendSubmit || console.log;
  
  window.handleTrendSubmit = async function(trendData) {
    console.log('🚀 Starting patched trend submission...');
    const startTime = Date.now();
    
    try {
      // Add timeout wrapper
      const timeout = 30000; // 30 seconds total timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Submission timeout after 30 seconds')), timeout);
      });
      
      // Log each step
      console.log('Step 1: Preparing submission data');
      console.log('Data:', trendData);
      
      // Call original function with timeout
      const result = await Promise.race([
        originalSubmit.call(this, trendData),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Submission completed in ${duration}ms`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Submission failed after ${duration}ms:`, error);
      
      // Show user-friendly error
      if (error.message.includes('timeout')) {
        alert('The submission is taking too long. Please try again with a different URL or refresh the page.');
      } else {
        alert(`Submission failed: ${error.message}`);
      }
      
      throw error;
    }
  };
  
  console.log('✅ Fix applied! Try submitting a trend now.');
  console.log('💡 Tip: Open the Network tab to see which requests might be hanging.');
})();

// Also add a helper to check current Supabase status
window.checkSupabaseStatus = async function() {
  console.log('🔍 Checking Supabase connection...');
  
  try {
    const { createClient } = await import('/utils/supabase/client');
    const supabase = createClient();
    
    // Test database connection
    console.log('Testing database query...');
    const { data, error } = await supabase
      .from('trend_submissions')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database error:', error);
    } else {
      console.log('✅ Database connection OK');
    }
    
    // Test storage
    console.log('Testing storage access...');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.error('❌ Storage error:', storageError);
    } else {
      console.log('✅ Storage access OK, buckets:', buckets);
    }
    
    // Check auth status
    const { data: { user } } = await supabase.auth.getUser();
    console.log('✅ Auth status:', user ? `Logged in as ${user.email}` : 'Not logged in');
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
};

console.log('💡 Run checkSupabaseStatus() to test your connection');