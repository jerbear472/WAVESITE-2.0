'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDirectLogin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // First, try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      let resultInfo: any = {
        timestamp: new Date().toISOString(),
        email,
        signInAttempt: {
          success: !signInError,
          error: signInError?.message,
          errorCode: signInError?.code,
          errorStatus: signInError?.status,
          user: signInData?.user ? {
            id: signInData.user.id,
            email: signInData.user.email,
            emailConfirmedAt: signInData.user.email_confirmed_at,
            createdAt: signInData.user.created_at,
            lastSignInAt: signInData.user.last_sign_in_at,
            appMetadata: signInData.user.app_metadata,
            userMetadata: signInData.user.user_metadata,
          } : null,
          session: signInData?.session ? {
            accessToken: 'present',
            refreshToken: 'present',
            expiresAt: signInData.session.expires_at,
          } : null,
        }
      };
      
      // If sign in failed, try to get more info
      if (signInError) {
        // Try to check if user exists in profiles table
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, username, created_at')
          .eq('email', email);
        
        resultInfo.profileCheck = {
          found: profiles && profiles.length > 0,
          count: profiles?.length || 0,
          error: profileError?.message,
          profiles: profiles
        };
        
        // Try admin auth functions if available
        try {
          const { data: { user } } = await supabase.auth.getUser();
          resultInfo.currentUser = user ? {
            id: user.id,
            email: user.email,
            emailConfirmedAt: user.email_confirmed_at
          } : null;
        } catch (e: any) {
          resultInfo.currentUser = { error: e.message };
        }
      }
      
      setResult(resultInfo);
      
    } catch (error: any) {
      setResult({
        timestamp: new Date().toISOString(),
        email,
        criticalError: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async () => {
    setLoading(true);
    try {
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check current user
      const { data: { user } } = await supabase.auth.getUser();
      
      setResult({
        timestamp: new Date().toISOString(),
        currentSession: session ? {
          user: session.user.email,
          expiresAt: session.expires_at
        } : null,
        currentUser: user ? {
          id: user.id,
          email: user.email,
          emailConfirmedAt: user.email_confirmed_at,
          createdAt: user.created_at
        } : null
      });
    } catch (error: any) {
      setResult({
        timestamp: new Date().toISOString(),
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      setResult({
        timestamp: new Date().toISOString(),
        signOut: {
          success: !error,
          error: error?.message
        }
      });
    } catch (error: any) {
      setResult({
        timestamp: new Date().toISOString(),
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Test Supabase Auth</h1>
          
          {/* Login Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={testDirectLogin}
                disabled={loading || !email || !password}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Test Direct Login
              </button>
              
              <button
                onClick={checkUserStatus}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Check Current User
              </button>
              
              <button
                onClick={signOutUser}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          {/* Results */}
          {result && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Results:</h2>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Instructions */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <h3 className="font-semibold mb-2">Testing Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>First click "Check Current User" to see if you're logged in</li>
              <li>If logged in, click "Sign Out" first</li>
              <li>Enter the email and password of the user who confirmed their email</li>
              <li>Click "Test Direct Login" to see detailed error information</li>
              <li>Check the results for any error codes or confirmation status</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}