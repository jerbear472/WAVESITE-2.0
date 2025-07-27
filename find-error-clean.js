// Clean error capture script - no duplicates
// Run this and then submit a trend

// Clear any previous captures
if (window.capturedErrors) {
  console.log('Clearing previous captures...');
}

// Set up error capture
window.capturedErrors = [];

// Override console.error if not already done
if (!window._originalConsoleError) {
  window._originalConsoleError = console.error;
  
  console.error = function(...args) {
    // Capture the error
    window.capturedErrors.push(args);
    
    // Look for submission-related errors
    const errorString = args.join(' ');
    if (errorString.includes('submitting trend') || 
        errorString.includes('supabase') || 
        errorString.includes('trend_submissions')) {
      console.log('🚨 SUBMISSION ERROR CAUGHT:');
      
      // Extract details from each argument
      args.forEach((arg, index) => {
        console.log(`  Arg ${index}:`, arg);
        if (arg && typeof arg === 'object' && arg.message) {
          console.log('  📍 Error message:', arg.message);
          console.log('  📍 Error code:', arg.code || 'none');
          console.log('  📍 Error details:', arg.details || 'none');
        }
      });
    }
    
    // Call original
    window._originalConsoleError.apply(console, args);
  };
}

// Function to show all captured errors
window.showErrors = function() {
  console.log('\n📋 ALL CAPTURED ERRORS:');
  if (window.capturedErrors.length === 0) {
    console.log('No errors captured yet');
    return;
  }
  
  window.capturedErrors.forEach((error, index) => {
    console.log(`\n🔴 Error ${index + 1}:`);
    error.forEach(arg => {
      if (typeof arg === 'object' && arg !== null) {
        console.log('  Object:', JSON.stringify(arg, null, 2));
      } else {
        console.log('  Value:', arg);
      }
    });
  });
};

// Quick status check
console.log('✅ Error capture ready!');
console.log('📝 Instructions:');
console.log('1. Submit a trend (it will fail)');
console.log('2. Run: showErrors()');
console.log('3. Look for "Error submitting trend" message');

// Also monitor for specific patterns in the page
setTimeout(() => {
  // Check if there are any error messages in the DOM
  const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], .text-red-500, .text-red-600');
  if (errorElements.length > 0) {
    console.log(`\n🔍 Found ${errorElements.length} error elements in page`);
    errorElements.forEach(el => {
      if (el.textContent?.trim()) {
        console.log('  Error text:', el.textContent.trim());
      }
    });
  }
}, 2000);