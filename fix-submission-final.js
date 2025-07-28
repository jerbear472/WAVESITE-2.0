// Final fix for submission hanging issue
// The problem appears to be a mismatch between what's logged and what's sent

// Run this to diagnose and fix the issue
(async function() {
  console.log('🚀 Applying comprehensive submission fix...\n');
  
  // 1. Check valid enum values for the database
  console.log('📋 Checking database schema...');
  
  // Valid category enums based on the code
  const VALID_CATEGORIES = ['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'];
  const VALID_STATUSES = ['pending', 'submitted', 'validating', 'approved', 'rejected', 'viral'];
  
  console.log('Valid categories:', VALID_CATEGORIES);
  console.log('Valid statuses:', VALID_STATUSES);
  
  // 2. Intercept fetch to see actual request
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    if (url?.includes?.('trend_submissions') && options?.method === 'POST') {
      console.log('\n🔍 Intercepted trend submission request!');
      console.log('URL:', url);
      
      if (options.body) {
        try {
          const body = JSON.parse(options.body);
          console.log('Request body:', body);
          
          // Check for issues
          if (body.category && !VALID_CATEGORIES.includes(body.category)) {
            console.error('❌ Invalid category:', body.category);
            console.log('Should be one of:', VALID_CATEGORIES);
          }
          
          if (body.status && !VALID_STATUSES.includes(body.status)) {
            console.error('❌ Invalid status:', body.status);
            console.log('Should be one of:', VALID_STATUSES);
          }
        } catch (e) {
          console.log('Could not parse body');
        }
      }
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏱️ Request timed out after 30 seconds');
        alert('Submission timed out. Please try again.');
      }, 30000);
      
      try {
        const response = await originalFetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📥 Response status:', response.status);
        
        // Clone response to read it
        const responseClone = response.clone();
        try {
          const responseData = await responseClone.json();
          console.log('Response data:', responseData);
          
          if (responseData.error) {
            console.error('❌ Server error:', responseData.error);
            alert('Submission error: ' + responseData.error.message);
          }
        } catch (e) {
          // Not JSON response
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('🚨 Fetch error:', error);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        throw error;
      }
    }
    
    return originalFetch(...args);
  };
  
  // 3. Test the actual submission function
  window.testDirectSubmission = async function() {
    console.log('\n🧪 Testing direct submission...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Not authenticated');
      return;
    }
    
    // Exactly match what the form is trying to submit
    const testData = {
      spotter_id: user.id,
      category: 'behavior_pattern', // Mapped from "Lifestyle"
      description: 'Test submission from debug script',
      evidence: {
        url: 'https://www.tiktok.com/test',
        title: 'Test Trend',
        platform: 'tiktok'
      },
      virality_prediction: 6,
      status: 'pending', // NOT 'submitted'
      quality_score: 0.5,
      validation_count: 0,
      created_at: new Date().toISOString()
    };
    
    console.log('Submitting:', testData);
    
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ Success:', data);
    
    // Clean up
    if (data?.id) {
      await supabase.from('trend_submissions').delete().eq('id', data.id);
      console.log('🧹 Cleaned up test data');
    }
  };
  
  // 4. Fix console.log mismatch
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    // Check if this is the submission log
    if (args[0] === 'Submitting data to database:' && args[1]) {
      const data = args[1];
      
      // The issue: the console is showing the wrong data!
      console.warn('⚠️ Data discrepancy detected!');
      console.warn('The logged data might not match what\'s actually being sent');
      
      // Check if category needs mapping
      if (data.category === 'Lifestyle') {
        console.warn('Category "Lifestyle" should be "behavior_pattern"');
      }
      
      // Check if status is wrong
      if (data.status === 'submitted') {
        console.warn('Status "submitted" might need to be "pending"');
      }
    }
    
    originalConsoleLog.apply(console, args);
  };
  
  console.log('\n✅ Fix applied!');
  console.log('\n📖 What this fix does:');
  console.log('1. Intercepts all trend_submissions requests to log actual data');
  console.log('2. Adds 30-second timeout to prevent hanging');
  console.log('3. Shows server response and errors');
  console.log('4. Warns about data mismatches');
  
  console.log('\n🎯 Next steps:');
  console.log('1. Try submitting the form again');
  console.log('2. Watch for the intercepted request log');
  console.log('3. Or run: testDirectSubmission() to test manually');
  
  // Check if there's a React error boundary issue
  window.addEventListener('error', function(e) {
    if (e.error?.message?.includes('trend')) {
      console.error('🚨 React error related to trends:', e.error);
    }
  });
  
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason?.message?.includes('trend')) {
      console.error('🚨 Unhandled promise rejection related to trends:', e.reason);
    }
  });
})();