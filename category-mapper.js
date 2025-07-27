// Category mapper to convert frontend values to valid enum values
// Add this to your submit page or form component

const categoryMap = {
  // Frontend value -> Database enum value
  'Humor & Memes': 'humor_memes',
  'Music & Dance': 'music_dance',
  'Fashion & Beauty': 'fashion_beauty',
  'Food & Cooking': 'food_cooking',
  'Sports & Fitness': 'sports_fitness',
  'Tech & Gaming': 'tech_gaming',
  'Education & DIY': 'education_diy',
  'News & Politics': 'news_politics',
  'Entertainment': 'entertainment',
  'Lifestyle': 'lifestyle',
  'Travel': 'travel',
  'Pets & Animals': 'pets_animals',
  'Art & Design': 'art_design',
  'Business': 'business'
};

// Function to convert category before submission
function mapCategory(frontendCategory) {
  return categoryMap[frontendCategory] || frontendCategory.toLowerCase().replace(/[&\s]+/g, '_');
}

// Test the mapping
console.log('Category mapping test:');
console.log('Humor & Memes ->', mapCategory('Humor & Memes'));
console.log('Fashion & Beauty ->', mapCategory('Fashion & Beauty'));

// To use in your submission:
// trendData.category = mapCategory(trendData.category);

// Quick fix for current page (run this to patch the form)
if (window.location.pathname === '/submit') {
  console.log('🔧 Patching category submission...');
  
  // Intercept fetch to fix categories
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    // Check if this is a Supabase request with trend data
    if (args[0] && args[0].toString().includes('trend_submissions') && args[1]?.body) {
      try {
        const body = JSON.parse(args[1].body);
        if (body.category) {
          const oldCategory = body.category;
          body.category = mapCategory(body.category);
          args[1].body = JSON.stringify(body);
          console.log(`📝 Mapped category: "${oldCategory}" -> "${body.category}"`);
        }
      } catch (e) {
        // Not JSON or no category
      }
    }
    
    return originalFetch(...args);
  };
  
  console.log('✅ Category mapping patch active!');
}