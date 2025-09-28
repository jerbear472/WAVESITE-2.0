'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly in the component
const SUPABASE_URL = 'https://aicahushpcslwjwrlqbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

export default function DirectLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    // Create client on mount to avoid SSR issues
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setSupabaseClient(client);
    setMessage('Supabase client initialized');
  }, []);

  const handleLogin = async () => {
    if (!supabaseClient) {
      setMessage('Supabase client not initialized');
      return;
    }

    setLoading(true);
    setMessage('Attempting login...');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
        console.error('Login error:', error);
      } else if (data?.user) {
        setMessage(`Success! User: ${data.user.email}`);
        console.log('Login successful:', data);

        // Store session and redirect
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setMessage('No error but no user data returned');
      }
    } catch (err: any) {
      setMessage(`Exception: ${err.message}`);
      console.error('Exception during login:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    if (!supabaseClient) {
      setMessage('Supabase client not initialized');
      return;
    }

    setMessage('Checking connection...');

    try {
      const { data, error } = await supabaseClient.auth.getSession();

      if (error) {
        setMessage(`Connection error: ${error.message}`);
      } else {
        setMessage(`Connected! Session exists: ${data.session ? 'Yes' : 'No'}`);
      }
    } catch (err: any) {
      setMessage(`Connection failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center">Direct Login Test</h1>

        <div className="bg-gray-900 p-6 rounded-lg space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={checkConnection}
              className="flex-1 p-3 bg-gray-700 rounded hover:bg-gray-600 transition"
            >
              Check Connection
            </button>

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="flex-1 p-3 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700 disabled:opacity-50 transition"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </div>

          <div className="p-3 bg-gray-800 rounded">
            <p className="text-sm font-mono">{message || 'Ready'}</p>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>URL: {SUPABASE_URL}</p>
            <p>Key: {SUPABASE_ANON_KEY.substring(0, 20)}...</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setEmail('test@example.com');
              setPassword('testpassword');
            }}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Fill test credentials
          </button>
        </div>
      </div>
    </div>
  );
}