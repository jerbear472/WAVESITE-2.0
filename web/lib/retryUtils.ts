/**
 * Utility functions for handling retries and timeouts
 */

export interface RetryOptions {
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Execute a function with retry logic and timeout
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    timeout = 45000,
    retryDelay = 2000,
    onRetry = () => {}
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout / 1000} seconds`));
        }, timeout);
      });

      // Race between the actual operation and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      
      return result; // Success!
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        onRetry(attempt, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  return error?.message?.toLowerCase().includes('timeout') ||
         error?.code === 'ETIMEDOUT' ||
         error?.code === 'ECONNABORTED';
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  return error?.message?.toLowerCase().includes('network') ||
         error?.message?.toLowerCase().includes('fetch') ||
         error?.code === 'ENETUNREACH' ||
         error?.code === 'ENOTFOUND';
}