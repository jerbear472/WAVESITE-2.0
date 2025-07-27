// Handle dynamic viewport height for mobile browsers
export function setViewportHeight() {
  if (typeof window === 'undefined') return;
  
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  // Set initial value
  setVH();
  
  // Update on resize and orientation change
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure orientation change is complete
    setTimeout(setVH, 100);
  });
  
  // Cleanup function
  return () => {
    window.removeEventListener('resize', setVH);
    window.removeEventListener('orientationchange', setVH);
  };
}

// Prevent zoom on input focus (iOS Safari)
export function preventZoomOnInput() {
  if (typeof window === 'undefined') return;
  
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      if (window.screen.width < 640) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          );
        }
      }
    });
    
    input.addEventListener('blur', () => {
      if (window.screen.width < 640) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0'
          );
        }
      }
    });
  });
}

// Smooth scroll polyfill for older browsers
export function enableSmoothScroll() {
  if (typeof window === 'undefined') return;
  
  if (!('scrollBehavior' in document.documentElement.style)) {
    // Load polyfill if needed
    import('smoothscroll-polyfill').then(smoothscroll => {
      smoothscroll.polyfill();
    });
  }
}

// Initialize all viewport utilities
export function initViewportUtils() {
  if (typeof window === 'undefined') return;
  
  const cleanup = setViewportHeight();
  preventZoomOnInput();
  enableSmoothScroll();
  
  return cleanup;
}