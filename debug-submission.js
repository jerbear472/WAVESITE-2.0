// Debug helper to check submission flow
console.log('🔍 Debugging Submission Flow');

// Check what's happening after submission
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('📡 Fetch called:', args[0]);
  return originalFetch.apply(this, args).then(response => {
    console.log('📡 Response status:', response.status);
    return response;
  });
};

// Monitor form submission
console.log('To debug submission issues:');
console.log('1. Open the trend submission form');
console.log('2. Fill it out and submit');
console.log('3. Watch the console for detailed logs');

// Helper to manually close the form if stuck
window.debugCloseForm = () => {
  const closeButton = document.querySelector('[aria-label="Close"]');
  if (closeButton) {
    closeButton.click();
    console.log('✅ Form closed');
  } else {
    console.log('❌ No close button found');
  }
  
  // Also try to set the state directly
  const event = new CustomEvent('debug-close-form');
  window.dispatchEvent(event);
};

console.log('Run debugCloseForm() if the form is stuck');
EOF < /dev/null
