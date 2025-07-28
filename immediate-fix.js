// IMMEDIATE FIX - Run this right now to fix the submission
(function() {
  console.log('🚨 Applying immediate submission fix...');
  
  // Override the fetch to fix the data before sending
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let [url, options] = args;
    
    // Check if this is a trend submission
    if (url?.includes?.('trend_submissions') && options?.method === 'POST' && options?.body) {
      console.log('🎯 Intercepting trend submission to fix data...');
      
      try {
        let body = JSON.parse(options.body);
        console.log('Original body:', body);
        
        // Fix the category mapping
        if (body.category && typeof body.category === 'string') {
          const CATEGORY_MAP = {
            'Fashion & Beauty': 'visual_style',
            'Food & Drink': 'behavior_pattern',
            'Humor & Memes': 'meme_format',
            'Lifestyle': 'behavior_pattern',
            'Politics & Social Issues': 'behavior_pattern',
            'Music & Dance': 'audio_music',
            'Sports & Fitness': 'behavior_pattern',
            'Tech & Gaming': 'creator_technique',
            'Art & Creativity': 'visual_style',
            'Education & Science': 'creator_technique'
          };
          
          const mappedCategory = CATEGORY_MAP[body.category] || 'meme_format';
          console.log(`🔧 Fixing category: "${body.category}" → "${mappedCategory}"`);
          body.category = mappedCategory;
        }
        
        // Fix the status
        if (body.status === 'submitted') {
          console.log('🔧 Fixing status: "submitted" → "pending"');
          body.status = 'pending';
        }
        
        // Ensure required fields have proper defaults
        body.validation_count = body.validation_count || 0;
        body.quality_score = body.quality_score || 0.5;
        body.virality_prediction = body.virality_prediction || 5;
        
        console.log('Fixed body:', body);
        
        // Update the options with fixed body
        options = {
          ...options,
          body: JSON.stringify(body)
        };
        
      } catch (e) {
        console.error('Could not parse/fix request body:', e);
      }
    }
    
    // Call original fetch with potentially modified data
    try {
      const response = await originalFetch(url, options);
      
      // Log response
      if (url?.includes?.('trend_submissions')) {
        const responseClone = response.clone();
        try {
          const data = await responseClone.json();
          if (data.error) {
            console.error('❌ Server error:', data.error);
            alert('Submission failed: ' + (data.error.message || 'Unknown error'));
          } else {
            console.log('✅ Server response:', data);
          }
        } catch (e) {
          // Not JSON
        }
      }
      
      return response;
    } catch (error) {
      console.error('🚨 Request failed:', error);
      if (url?.includes?.('trend_submissions')) {
        alert('Submission failed: ' + error.message);
      }
      throw error;
    }
  };
  
  console.log('✅ Fix applied! Try submitting again.');
  console.log('This fix will:');
  console.log('1. Map "Fashion & Beauty" → "visual_style"');
  console.log('2. Change "submitted" → "pending"');
  console.log('3. Show any server errors');
})();

// Also add a manual submission function for testing
window.manualSubmit = async function(formData) {
  console.log('📤 Manual submission...');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Not authenticated');
    return;
  }
  
  // Map category properly
  const CATEGORY_MAP = {
    'Fashion & Beauty': 'visual_style',
    'Food & Drink': 'behavior_pattern',
    'Humor & Memes': 'meme_format',
    'Lifestyle': 'behavior_pattern',
    'Politics & Social Issues': 'behavior_pattern',
    'Music & Dance': 'audio_music',
    'Sports & Fitness': 'behavior_pattern',
    'Tech & Gaming': 'creator_technique',
    'Art & Creativity': 'visual_style',
    'Education & Science': 'creator_technique'
  };
  
  const category = formData?.categories?.[0] || 'Humor & Memes';
  const mappedCategory = CATEGORY_MAP[category] || 'meme_format';
  
  const data = {
    spotter_id: user.id,
    category: mappedCategory,
    description: formData?.explanation || 'Test submission',
    evidence: {
      url: formData?.url || 'https://example.com',
      title: formData?.trendName || 'Test',
      platform: formData?.platform || 'tiktok',
      ...(formData ? {
        ageRanges: formData.ageRanges,
        categories: formData.categories,
        moods: formData.moods,
        spreadSpeed: formData.spreadSpeed,
        firstSeen: formData.firstSeen,
        otherPlatforms: formData.otherPlatforms,
        brandAdoption: formData.brandAdoption
      } : {})
    },
    virality_prediction: 5,
    status: 'pending',
    quality_score: 0.5,
    validation_count: 0,
    creator_handle: formData?.creator_handle,
    creator_name: formData?.creator_name,
    post_caption: formData?.post_caption,
    likes_count: formData?.likes_count || 0,
    comments_count: formData?.comments_count || 0,
    views_count: formData?.views_count || 0,
    hashtags: formData?.hashtags || [],
    thumbnail_url: formData?.thumbnail_url,
    created_at: new Date().toISOString()
  };
  
  console.log('Submitting:', data);
  
  const { data: result, error } = await supabase
    .from('trend_submissions')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success:', result);
  }
};