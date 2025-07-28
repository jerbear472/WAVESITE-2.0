// Fix for trend submission hanging issue
// This adds better error handling and timeout to the submission process

// Run this in browser console to patch the submission handler
(function() {
  console.log('🔧 Applying submission fix...');
  
  // Find the React component instance
  const submitButton = document.querySelector('button[type="submit"]');
  if (!submitButton) {
    console.error('❌ Submit button not found');
    return;
  }
  
  // Add global error handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    if (event.reason?.message?.includes('trend_submissions')) {
      console.error('This is related to trend submission!');
      alert('Error submitting trend: ' + (event.reason.message || 'Unknown error'));
    }
  });
  
  // Monitor fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Check if this is a Supabase request
    if (url && url.includes('supabase.co')) {
      console.log('📡 Supabase request:', url);
      console.log('Request options:', options);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏱️ Request timed out after 30 seconds');
      }, 30000);
      
      try {
        const response = await originalFetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Log response details
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Response error:', errorText);
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.error('⏱️ Request aborted due to timeout');
          alert('Request timed out. Please check your connection and try again.');
        } else {
          console.error('🚨 Fetch error:', error);
        }
        throw error;
      }
    }
    
    // For non-Supabase requests, use original fetch
    return originalFetch(...args);
  };
  
  console.log('✅ Fix applied! Try submitting again.');
  console.log('📋 The console will now show detailed logs for all Supabase requests.');
})();

// Additional helper to manually trigger submission with logging
window.debugSubmitTrend = async function(formData) {
  console.log('🧪 Manual submission test starting...');
  
  try {
    // Get auth session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('❌ Auth error:', authError || 'No session');
      return;
    }
    
    console.log('✅ Auth OK, user:', session.user.email);
    
    // Prepare minimal test data
    const testData = {
      spotter_id: session.user.id,
      category: 'meme_format',
      description: formData?.explanation || 'Debug test submission',
      evidence: {
        url: formData?.url || 'https://example.com',
        title: formData?.trendName || 'Debug Test'
      },
      virality_prediction: 5,
      status: 'pending',
      quality_score: 0.5,
      validation_count: 0,
      creator_handle: formData?.creator_handle || '@test',
      post_caption: formData?.post_caption || 'Test caption',
      likes_count: formData?.likes_count || 0,
      comments_count: formData?.comments_count || 0,
      views_count: formData?.views_count || 0,
      posted_at: new Date().toISOString()
    };
    
    console.log('📤 Submitting data:', testData);
    
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Submission error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Provide specific guidance
      if (error.code === 'PGRST301') {
        console.log('🔧 This is an RLS policy error. The user may not have permission to insert.');
        console.log('Run this SQL in Supabase to fix:');
        console.log(`
CREATE POLICY "Users can create their own submissions" ON trend_submissions
FOR INSERT WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can view their own submissions" ON trend_submissions
FOR SELECT USING (auth.uid() = spotter_id);
        `);
      }
      
      return;
    }
    
    console.log('✅ Submission successful!', data);
    
    // Clean up
    if (data?.id) {
      setTimeout(async () => {
        await supabase.from('trend_submissions').delete().eq('id', data.id);
        console.log('🧹 Test data cleaned up');
      }, 5000);
    }
    
  } catch (err) {
    console.error('🚨 Unexpected error:', err);
  }
};

console.log('\n📖 Usage:');
console.log('1. Try submitting the form normally - it will now show detailed logs');
console.log('2. Or run: debugSubmitTrend() for a manual test');
console.log('3. Or run: debugSubmitTrend(formData) with your form data');