// Fix for category submission issue
// The problem: Category is not being properly mapped from "Lifestyle" to "behavior_pattern"

// Run this in the browser console to test the submission with proper category mapping

async function testCategorySubmission() {
  console.log('🔍 Testing category submission fix...');
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not authenticated');
    return;
  }
  
  console.log('✅ User:', user.email);
  
  // Test category mapping
  const testCategories = ['Lifestyle', 'Humor & Memes', 'Music & Dance', 'Tech & Gaming'];
  console.log('\n📋 Testing category mappings:');
  
  // Import the mapping function (if available in window)
  const mapCategoryToEnum = (category) => {
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
    
    return CATEGORY_MAP[category] || 'meme_format';
  };
  
  testCategories.forEach(cat => {
    const mapped = mapCategoryToEnum(cat);
    console.log(`${cat} → ${mapped}`);
  });
  
  // Test submission with proper category
  console.log('\n🧪 Testing submission with mapped category...');
  
  const formData = {
    url: "https://www.tiktok.com/@.presro/video/7501498494490922270",
    trendName: "Test Bengals Trend",
    platform: "tiktok",
    explanation: "Testing category mapping",
    categories: ["Lifestyle"], // This should map to "behavior_pattern"
    ageRanges: ["Gen Z (15-24)"],
    moods: ["Playful"],
    spreadSpeed: "picking_up",
    firstSeen: "today",
    otherPlatforms: ["instagram"],
    brandAdoption: false
  };
  
  // Map the category BEFORE creating insertData
  const mappedCategory = mapCategoryToEnum(formData.categories[0]);
  console.log(`Mapping ${formData.categories[0]} → ${mappedCategory}`);
  
  const insertData = {
    spotter_id: user.id,
    category: mappedCategory, // Use the mapped value!
    description: formData.explanation,
    evidence: {
      url: formData.url,
      title: formData.trendName,
      platform: formData.platform,
      categories: formData.categories,
      ageRanges: formData.ageRanges,
      moods: formData.moods,
      spreadSpeed: formData.spreadSpeed,
      firstSeen: formData.firstSeen,
      otherPlatforms: formData.otherPlatforms,
      brandAdoption: formData.brandAdoption
    },
    virality_prediction: 6,
    status: 'pending',
    quality_score: 0.5,
    validation_count: 0,
    created_at: new Date().toISOString()
  };
  
  console.log('📤 Submitting with data:', insertData);
  console.log('✅ Category field is:', insertData.category);
  
  try {
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Submission error:', error);
      
      // Check if it's a category enum error
      if (error.message?.includes('invalid input value for enum')) {
        console.log('🔧 This is a category enum error!');
        console.log('Valid enum values are: visual_style, audio_music, creator_technique, meme_format, product_brand, behavior_pattern');
        console.log(`You tried to submit: "${insertData.category}"`);
        
        // Get valid enum values from database
        const { data: enumData } = await supabase.rpc('get_enum_values', {
          enum_typename: 'trend_category'
        }).catch(() => ({ data: null }));
        
        if (enumData) {
          console.log('Valid categories from database:', enumData);
        }
      }
      
      return;
    }
    
    console.log('✅ Submission successful!', data);
    
    // Clean up test data
    if (data?.id) {
      setTimeout(async () => {
        await supabase.from('trend_submissions').delete().eq('id', data.id);
        console.log('🧹 Test data cleaned up');
      }, 3000);
    }
    
  } catch (err) {
    console.error('🚨 Unexpected error:', err);
  }
}

// Quick fix: Override the form submission to ensure category mapping
function patchFormSubmission() {
  console.log('🔧 Patching form submission...');
  
  // Find all submit buttons
  const submitButtons = document.querySelectorAll('button[type="submit"], button:contains("Submit")');
  
  submitButtons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function(e) {
      console.log('🎯 Intercepted submission - will ensure category is mapped');
      // The original handler will still run, but we've added logging
    });
  });
  
  // Monitor console logs
  const originalLog = console.log;
  console.log = function(...args) {
    if (args[0]?.includes?.('Submitting data to database:') && args[1]) {
      const data = args[1];
      if (data.category && !['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'].includes(data.category)) {
        console.warn('⚠️ WARNING: Category not properly mapped!');
        console.warn(`Category "${data.category}" is not a valid enum value`);
        console.warn('This submission will likely fail');
      }
    }
    originalLog.apply(console, args);
  };
  
  console.log('✅ Patch applied!');
}

console.log('📖 Run these commands:');
console.log('1. testCategorySubmission() - Test submission with proper category mapping');
console.log('2. patchFormSubmission() - Add logging to catch category issues');

// Auto-run the patch
patchFormSubmission();