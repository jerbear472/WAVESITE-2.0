import { createWorker, Worker } from 'tesseract.js';

let worker: Worker | null = null;
let initializationPromise: Promise<Worker> | null = null;

/**
 * Get or create a Tesseract worker instance
 * This helps with performance by reusing the same worker
 */
export async function getTesseractWorker(): Promise<Worker> {
  // If already initializing, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // If worker exists and is ready, return it
  if (worker) {
    return worker;
  }
  
  // Initialize new worker
  initializationPromise = (async () => {
    try {
      console.log('Creating Tesseract worker...');
      const newWorker = await createWorker('eng', 1, {
        logger: (m) => {
          // Log all messages for debugging
          console.log('Tesseract:', m);
        },
        errorHandler: (err) => {
          console.error('Tesseract error:', err);
        }
      });
      
      console.log('Tesseract worker created successfully');
      return newWorker;
    } catch (error) {
      console.error('Failed to create Tesseract worker:', error);
      throw error;
    }
  })();
  
  try {
    worker = await initializationPromise;
    return worker;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Cleanup the worker when done
 */
export async function cleanupTesseractWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * Preload Tesseract worker for better performance
 * Call this early in your app initialization
 */
export async function preloadTesseract() {
  try {
    await getTesseractWorker();
    console.log('Tesseract.js preloaded successfully');
  } catch (error) {
    console.error('Failed to preload Tesseract.js:', error);
  }
}