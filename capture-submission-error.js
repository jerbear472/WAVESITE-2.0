// Capture the exact submission error
// Run this BEFORE submitting another trend

// Enhanced error capture
window.addEventListener('unhandledrejection', event => {
  console.error('🔴 CAUGHT ERROR:', event.reason);
  if (event.reason?.message) {
    console.error('Error Message:', event.reason.message);
  }
  if (event.reason?.code) {
    console.error('Error Code:', event.reason.code);
  }
  if (event.reason?.hint) {
    console.error('Error Hint:', event.reason.hint);
  }
  if (event.reason?.details) {
    console.error('Error Details:', event.reason.details);
  }
});

// Intercept console.error to catch all errors
const originalError = console.error;
console.error = function(...args) {
  console.log('🚨 CONSOLE ERROR CAPTURED:', ...args);
  originalError.apply(console, args);
};

// Monitor all fetch requests with detailed logging
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = args[0];
  console.log('📡 Fetch:', url);
  
  try {
    const response = await originalFetch(...args);
    
    // Log Supabase requests specially
    if (url.includes('supabase.co') || url.includes('trend_submissions')) {
      console.log('🔵 Supabase request to:', url);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.clone().text();
        console.error('❌ SUPABASE ERROR:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        // Try to parse as JSON
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Parsed error:', errorJson);
        } catch (e) {
          // Not JSON
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('❌ FETCH ERROR:', error);
    throw error;
  }
};

// Also monitor XHR requests
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  console.log('📡 XHR Request:', method, url);
  
  this.addEventListener('load', function() {
    if (this.status >= 400) {
      console.error('❌ XHR Error:', {
        url: url,
        status: this.status,
        response: this.responseText
      });
    }
  });
  
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

console.log('🎯 Enhanced error monitoring active!');
console.log('📝 Now submit a trend and watch for errors...');

// Quick check for Supabase in various places
setTimeout(() => {
  console.log('\n🔍 Checking for Supabase client...');
  
  // Check common locations
  const locations = [
    'window.supabase',
    'window.__supabase',
    'window.Supabase',
    'globalThis.supabase'
  ];
  
  locations.forEach(loc => {
    try {
      const val = eval(loc);
      if (val) {
        console.log(`✅ Found at ${loc}:`, val);
      }
    } catch (e) {
      // Silent fail
    }
  });
  
  // Check React components
  const reactRoot = document.querySelector('#__next') || document.querySelector('#root');
  if (reactRoot && reactRoot._reactRootContainer) {
    console.log('✅ React root found');
  }
}, 1000);