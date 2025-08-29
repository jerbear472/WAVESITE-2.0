// Global error recovery utilities
export class ErrorRecovery {
  private static errorCount = 0;
  private static lastErrorTime = 0;
  private static readonly ERROR_THRESHOLD = 3;
  private static readonly TIME_WINDOW = 5000; // 5 seconds

  static handleError(error: any, context?: string) {
    const now = Date.now();
    
    // Reset counter if enough time has passed
    if (now - this.lastErrorTime > this.TIME_WINDOW) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;
    
    console.error(`[${context || 'Global'}] Error:`, error);
    
    // If too many errors in short time, suggest reload
    if (this.errorCount >= this.ERROR_THRESHOLD) {
      console.warn('Multiple errors detected. App may be in unstable state.');
      return true; // Indicates reload might be needed
    }
    
    return false;
  }
  
  static reset() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }
}

// Wrapper for async operations with error recovery
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const needsReload = ErrorRecovery.handleError(error, context);
    if (needsReload) {
      // Don't auto-reload, but show user a message
      console.error('App stability compromised. Manual reload recommended.');
    }
    return fallback;
  }
}

// Wrapper for event handlers
export function safeHandler(
  handler: (...args: any[]) => void | Promise<void>,
  context?: string
) {
  return async (...args: any[]) => {
    try {
      await handler(...args);
    } catch (error) {
      ErrorRecovery.handleError(error, context);
      // Don't re-throw to prevent app crash
    }
  };
}

// Add global unhandled rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    ErrorRecovery.handleError(event.reason, 'UnhandledRejection');
    // Prevent default browser error
    event.preventDefault();
  });
  
  window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    ErrorRecovery.handleError(event.error, 'GlobalError');
    // Let error boundary handle React errors
    if (!event.error?.stack?.includes('React')) {
      event.preventDefault();
    }
  });
}