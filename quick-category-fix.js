// Quick fix for category submission error
// Run this on your Vercel site before submitting

// Override fetch to fix category values
const _originalFetch = window.fetch;
window.fetch = async function(...args) {
  // Check if this is a trend submission
  if (args[0] && args[1]?.body && (args[0].toString().includes('trend_submissions') || args[0].toString().includes('supabase'))) {
    try {
      let body = JSON.parse(args[1].body);
      
      // Fix category if present
      if (body.category) {
        const oldCategory = body.category;
        
        // Convert to database-friendly format
        body.category = body.category
          .toLowerCase()
          .replace(/\s*&\s*/g, '_')  // Replace & with _
          .replace(/\s+/g, '_')       // Replace spaces with _
          .replace(/_+/g, '_');       // Remove duplicate underscores
        
        console.log(`✅ Fixed category: "${oldCategory}" → "${body.category}"`);
        
        // Update the request body
        args[1].body = JSON.stringify(body);
      }
      
      // Also fix arrays if categories is an array
      if (body.categories && Array.isArray(body.categories)) {
        body.categories = body.categories.map(cat => 
          cat.toLowerCase()
            .replace(/\s*&\s*/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
        );
        args[1].body = JSON.stringify(body);
      }
    } catch (e) {
      // Not JSON, ignore
    }
  }
  
  return _originalFetch.apply(this, args);
};

console.log('✅ Category fix active!');
console.log('📝 Now submit your trend - categories will be automatically fixed');
console.log('');
console.log('Examples of conversions:');
console.log('  "Humor & Memes" → "humor_memes"');
console.log('  "Fashion & Beauty" → "fashion_beauty"');
console.log('  "Music & Dance" → "music_dance"');