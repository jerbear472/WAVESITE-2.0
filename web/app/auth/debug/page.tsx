'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const info: any = {};
      
      // Check current session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        info.session = {
          exists: !!session,
          user: session?.user?.email,
          emailConfirmed: session?.user?.email_confirmed_at,
          error: error?.message
        };
      } catch (e: any) {
        info.session = { error: e.message };
      }
      
      // Check current user
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        info.user = {
          exists: !!user,
          id: user?.id,
          email: user?.email,
          emailConfirmed: user?.email_confirmed_at,
          createdAt: user?.created_at,
          error: error?.message
        };
      } catch (e: any) {
        info.user = { error: e.message };
      }
      
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      info.urlParams = {
        search: Object.fromEntries(urlParams.entries()),
        hash: Object.fromEntries(hashParams.entries()),
        fullUrl: window.location.href
      };
      
      // Check Supabase configuration
      info.config = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      };
      
      setDebugInfo(info);
      setLoading(false);
    };
    
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Auth Debug Information</h1>
          
          {loading ? (
            <p>Loading diagnostics...</p>
          ) : (
            <div className="space-y-6">
              {/* Session Info */}
              <section>
                <h2 className="text-lg font-semibold mb-2">Current Session</h2>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(debugInfo.session, null, 2)}
                </pre>
              </section>
              
              {/* User Info */}
              <section>
                <h2 className="text-lg font-semibold mb-2">Current User</h2>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(debugInfo.user, null, 2)}
                </pre>
              </section>
              
              {/* URL Parameters */}
              <section>
                <h2 className="text-lg font-semibold mb-2">URL Parameters</h2>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(debugInfo.urlParams, null, 2)}
                </pre>
              </section>
              
              {/* Configuration */}
              <section>
                <h2 className="text-lg font-semibold mb-2">Configuration</h2>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(debugInfo.config, null, 2)}
                </pre>
              </section>
              
              {/* Instructions */}
              <section className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                <h2 className="text-lg font-semibold mb-2">Debug Steps</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Register a new account and note the email used</li>
                  <li>Check your email for the confirmation link</li>
                  <li>Before clicking the link, open this debug page in a new tab</li>
                  <li>Click the confirmation link</li>
                  <li>If redirected to login, refresh this debug page to see updated info</li>
                  <li>Try logging in with your credentials</li>
                  <li>If login fails, refresh this page again and check the session/user status</li>
                </ol>
              </section>
              
              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Refresh Diagnostics
                </button>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Go to Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Go to Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}