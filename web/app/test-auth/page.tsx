'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        setResult(`Connection Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
      } else {
        setResult('✅ Connection successful! Database is accessible.');
      }
    } catch (e: any) {
      setResult(`Unexpected error: ${e.message}`);
    }
    
    setLoading(false);
  };

  const testSignUp = async () => {
    if (!email || !password) {
      setResult('Please enter email and password');
      return;
    }
    
    setLoading(true);
    setResult('Testing signup...');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setResult(`Signup Error: ${error.message}\nStatus: ${error.status}\n\nFull error: ${JSON.stringify(error, null, 2)}`);
      } else {
        setResult(`Signup Result: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (e: any) {
      setResult(`Unexpected error: ${e.message}`);
    }
    
    setLoading(false);
  };

  const testSignIn = async () => {
    if (!email || !password) {
      setResult('Please enter email and password');
      return;
    }
    
    setLoading(true);
    setResult('Testing signin...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setResult(`Signin Error: ${error.message}\nStatus: ${error.status}\n\nFull error: ${JSON.stringify(error, null, 2)}`);
      } else {
        setResult(`Signin Success: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (e: any) {
      setResult(`Unexpected error: ${e.message}`);
    }
    
    setLoading(false);
  };

  const checkAuthSettings = async () => {
    setLoading(true);
    setResult('Checking auth settings...');
    
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      const info = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        session: session ? 'Active session found' : 'No session',
        user: user ? user.email : 'No user',
        sessionError: sessionError?.message,
        userError: userError?.message,
      };
      
      setResult(`Auth Settings:\n${JSON.stringify(info, null, 2)}`);
    } catch (e: any) {
      setResult(`Error checking auth: ${e.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Supabase Auth Debugger</h1>
      
      <div className="space-y-6">
        {/* Connection Test */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">1. Test Database Connection</h2>
          <button 
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Test Connection
          </button>
        </div>

        {/* Auth Settings */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">2. Check Auth Settings</h2>
          <button 
            onClick={checkAuthSettings}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Check Settings
          </button>
        </div>

        {/* Test Credentials */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-4">3. Test Login/Signup</h2>
          <div className="space-y-2 mb-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="space-x-2">
            <button 
              onClick={testSignUp}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Test Sign Up
            </button>
            <button 
              onClick={testSignIn}
              disabled={loading}
              className="bg-indigo-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Test Sign In
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h2 className="font-semibold mb-2">Result:</h2>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-gray-600">
        <p>Visit this page at: <a href="http://localhost:3000/test-auth" className="text-blue-500">http://localhost:3000/test-auth</a></p>
        <p>This will help identify the exact error with Supabase authentication.</p>
      </div>
    </div>
  );
}