'use client';

import { useEffect } from 'react';

export default function TraceError() {
  useEffect(() => {
    // Override fetch to log all requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      console.log('[FETCH] Request:', args);
      try {
        const response = await originalFetch(...args);
        console.log('[FETCH] Response:', response.status, response.statusText);
        return response;
      } catch (error) {
        console.error('[FETCH] Error:', error);
        throw error;
      }
    };

    // Listen for all errors
    const errorHandler = (e: ErrorEvent) => {
      console.error('[ERROR EVENT]', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
      });
    };
    window.addEventListener('error', errorHandler);

    // Listen for unhandled promise rejections
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      console.error('[PROMISE REJECTION]', e.reason);
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    console.log('[TRACE] Error tracking initialized');

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  const testSupabase = async () => {
    console.log('[TEST] Starting Supabase test...');
    try {
      // Import dynamically to catch any loading errors
      const { supabase } = await import('@/lib/supabase');
      console.log('[TEST] Supabase imported successfully');

      const { data, error } = await supabase.auth.getSession();
      console.log('[TEST] Session result:', { data, error });
    } catch (err) {
      console.error('[TEST] Failed:', err);
    }
  };

  const testLogin = async () => {
    console.log('[LOGIN TEST] Starting...');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123'
      });
      console.log('[LOGIN TEST] Result:', { data, error });
    } catch (err) {
      console.error('[LOGIN TEST] Exception:', err);
    }
  };

  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Error Tracer</h1>
      <p className="mb-4">Open browser console to see all network requests and errors</p>

      <div className="space-x-4">
        <button
          onClick={testSupabase}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Test Supabase Import
        </button>

        <button
          onClick={testLogin}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Test Login
        </button>
      </div>

      <div className="mt-8 p-4 bg-gray-900 rounded">
        <p>Check the browser console for:</p>
        <ul className="list-disc list-inside mt-2">
          <li>[FETCH] - All network requests</li>
          <li>[ERROR EVENT] - JavaScript errors</li>
          <li>[PROMISE REJECTION] - Async errors</li>
          <li>[TEST] - Test results</li>
        </ul>
      </div>
    </div>
  );
}