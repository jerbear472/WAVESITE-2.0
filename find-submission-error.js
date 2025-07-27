// Find the actual submission error
// Run this and then submit a trend

// Override console.error to capture ALL errors
const originalConsoleError = console.error;
const capturedErrors = [];

console.error = function(...args) {
  // Capture the error
  capturedErrors.push(args);
  
  // Look for submission-related errors
  const errorString = args.join(' ');
  if (errorString.includes('submitting trend') || 
      errorString.includes('supabase') || 
      errorString.includes('trend_submissions')) {
    console.log('🚨 SUBMISSION ERROR CAUGHT:', ...args);
    
    // Extract the actual error object
    args.forEach(arg => {
      if (arg && typeof arg === 'object') {
        if (arg.message) console.log('   Error message:', arg.message);
        if (arg.code) console.log('   Error code:', arg.code);
        if (arg.details) console.log('   Error details:', arg.details);
        if (arg.hint) console.log('   Error hint:', arg.hint);
        if (arg.stack) console.log('   Stack trace:', arg.stack.split('\n')[0]);
      }
    });
  }
  
  // Call original console.error
  originalConsoleError.apply(console, args);
};

// Also capture Promise rejections
window.addEventListener('unhandledrejection', event => {
  console.log('🔴 Unhandled Promise Rejection:', event.reason);
  capturedErrors.push(['Promise rejection', event.reason]);
});

// Function to show all captured errors
window.showCapturedErrors = function() {
  console.log('\n📋 ALL CAPTURED ERRORS:');
  capturedErrors.forEach((error, index) => {
    console.log(`\nError ${index + 1}:`, ...error);
  });
};

console.log('✅ Error capture active!');
console.log('1️⃣ Now submit a trend');
console.log('2️⃣ Then run: showCapturedErrors()');

// Quick environment check
console.log('\n🔍 Environment check:');
console.log('- Page URL:', window.location.href);
console.log('- Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('- On Vercel:', window.location.hostname.includes('vercel'));

// Monitor network for Supabase calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : args[0].url;
  
  if (url && url.includes('supabase')) {
    console.log('🌐 Supabase request:', url);
  }
  
  try {
    const response = await originalFetch(...args);
    
    if (url && url.includes('supabase') && !response.ok) {
      const errorBody = await response.clone().text();
      console.error('❌ Supabase error response:', {
        url: url,
        status: response.status,
        body: errorBody
      });
    }
    
    return response;
  } catch (error) {
    console.error('❌ Fetch failed:', url, error);
    throw error;
  }
};