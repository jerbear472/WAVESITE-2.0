'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Direct Supabase client for debugging
const supabase = createClient(
  'https://aicahushpcslwjwrlqbo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w'
);

export default function LoginDebugPage() {
  const [email, setEmail] = useState('demo1755123016943@wavesight.com');
  const [password, setPassword] = useState('Demo123456!');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const handleDirectLogin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('Attempting direct Supabase login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error:', error);
        setError(error);
      } else {
        console.log('Login successful:', data);
        setResult(data);
        
        // Try to fetch profile
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
          console.log('Profile:', profile, 'Error:', profileError);
          
          // Redirect after successful login
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session);
    setResult({ session });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Login Debug Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Direct Supabase Login Test</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleDirectLogin}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Direct Login'}
              </button>
              
              <button
                onClick={checkSession}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Check Session
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
            <pre className="text-sm text-red-600 whitespace-pre-wrap">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}
        
        {result && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Success:</h3>
            <pre className="text-sm text-green-600 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.user && (
              <p className="mt-4 text-green-700 font-semibold">
                ✅ Login successful! Redirecting to dashboard...
              </p>
            )}
          </div>
        )}
        
        <div className="mt-8 bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Quick Actions:</h3>
          <ul className="space-y-2 text-sm">
            <li>• Open browser console (F12) to see detailed logs</li>
            <li>• Default credentials are pre-filled</li>
            <li>• This bypasses the AuthContext to test direct Supabase connection</li>
            <li>• Check the response for any specific error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}