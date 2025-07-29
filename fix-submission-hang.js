// Fix for submission hang issue
console.log('🔧 Applying submission hang fix...');

// Monitor the submission form state
let submissionInProgress = false;
let submissionStartTime = null;

// Intercept console logs to detect submission
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] === 'Starting trend submission with data:') {
    submissionInProgress = true;
    submissionStartTime = Date.now();
    console.warn('⏱️ Submission started, monitoring for hang...');
  }
  
  if (args[0] === 'Trend submitted successfully:') {
    const duration = Date.now() - submissionStartTime;
    console.warn(`✅ Submission completed in ${duration}ms`);
    
    // Check if form is still open after success
    setTimeout(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        console.error('❌ Form still open 2 seconds after success\! This is the bug.');
        console.warn('💡 Attempting auto-close...');
        
        // Try to find and click close button
        const closeButton = modal.querySelector('button[aria-label*="Close"], button:has(svg[class*="X"])');
        if (closeButton) {
          closeButton.click();
          console.warn('✅ Form closed automatically');
        }
      }
    }, 2000);
  }
  
  originalLog.apply(console, args);
};

// Add a manual fix function
window.fixSubmissionHang = () => {
  console.log('🔧 Running manual fix...');
  
  // Find and close any open modals
  const modals = document.querySelectorAll('[role="dialog"]');
  modals.forEach(modal => {
    const closeButton = modal.querySelector('button');
    if (closeButton) {
      closeButton.click();
      console.log('✅ Closed modal');
    }
  });
  
  // Reset form state if needed
  const submitButtons = document.querySelectorAll('button:disabled');
  submitButtons.forEach(btn => {
    btn.disabled = false;
    console.log('✅ Re-enabled button');
  });
};

console.log('💡 If submission hangs, run: fixSubmissionHang()');
EOF < /dev/null
