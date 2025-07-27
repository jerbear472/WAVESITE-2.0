// Debug category submission on production
// Run this in the browser console on your Vercel app

// Override console.error to capture the exact error
const _originalError = console.error;
console.error = function(...args) {
  const errorStr = args.join(' ');
  if (errorStr.includes('category') || errorStr.includes('trend')) {
    console.log('🚨 CAPTURED ERROR:', ...args);
    
    // Look for the actual database error
    args.forEach(arg => {
      if (arg && typeof arg === 'object') {
        console.log('Error object:', JSON.stringify(arg, null, 2));
      }
    });
  }
  _originalError.apply(console, args);
};

// Monitor form data being sent
const _fetch = window.fetch;
window.fetch = async function(...args) {
  if (args[0] && args[1]?.body) {
    try {
      const body = JSON.parse(args[1].body);
      if (body.category || body.categories) {
        console.log('📤 SENDING DATA:', {
          category: body.category,
          categories: body.categories,
          url: args[0]
        });
      }
    } catch (e) {}
  }
  
  const response = await _fetch.apply(this, args);
  
  // Log error responses
  if (!response.ok && args[0].includes('trend')) {
    const text = await response.clone().text();
    console.log('❌ ERROR RESPONSE:', {
      status: response.status,
      url: args[0],
      body: text
    });
  }
  
  return response;
};

console.log('✅ Debug mode active! Submit a trend to see what\'s happening.');