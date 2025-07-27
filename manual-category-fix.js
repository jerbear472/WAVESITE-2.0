// Manual fix - run this on your Vercel site to bypass the issue temporarily

// Override the submission to use a known working category
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  // Check if this is a trend submission
  if (args[0]?.toString().includes('trend_submissions') && args[1]?.body) {
    try {
      let body = JSON.parse(args[1].body);
      
      console.log('🔍 Original category:', body.category);
      
      // Force a known working category
      body.category = 'meme_format';  // This should definitely work
      
      console.log('✅ Forced category to:', body.category);
      
      // Update the request
      args[1].body = JSON.stringify(body);
    } catch (e) {
      console.error('Failed to modify request:', e);
    }
  }
  
  return originalFetch.apply(this, args);
};

console.log('🔧 Manual fix active! All submissions will use "meme_format" category.');
console.log('This is temporary - we need to fix the real issue.');

// Also let's check what Vercel actually deployed
fetch('/_next/static/chunks/app/(authenticated)/submit/page.js')
  .then(r => r.text())
  .then(text => {
    if (text.includes('mapCategoryToEnum')) {
      console.log('✅ categoryMapper IS deployed');
    } else {
      console.log('❌ categoryMapper NOT found in deployed code');
    }
  })
  .catch(() => console.log('Could not check deployment'));