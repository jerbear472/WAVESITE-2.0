'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestEmailAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSignUp = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Check current auth settings
      const authSettings = {
        confirmEmail: false, // Disable email confirmation for testing
        emailRedirectTo: undefined // No redirect needed if no confirmation
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Don't set redirect if we're not confirming
          data: {
            username: email.split('@')[0], // Use email prefix as username
          }
        }
      });

      if (error) {
        setResult({
          success: false,
          error: error.message,
          details: error,
          suggestion: getErrorSuggestion(error.message)
        });
      } else {
        // Check if user was created
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', email)
          .single();

        setResult({
          success: true,
          authData: data,
          userProfile: userData,
          userError: userError?.message,
          note: data?.user?.identities?.length === 0 
            ? 'User already exists but not confirmed. Check email settings in Supabase dashboard.'
            : 'User created successfully!'
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setResult({
          success: false,
          error: error.message,
          details: error
        });
      } else {
        setResult({
          success: true,
          user: data.user,
          session: data.session ? 'Active session created' : 'No session'
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSupabaseSettings = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check auth settings
      const settings = {
        currentUser: user,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };

      setResult({
        settings,
        recommendation: `
To fix email issues:
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Email Templates
3. Check if "Enable email confirmations" is ON
4. If you want to disable it for testing:
   - Go to Authentication > Providers > Email
   - Turn OFF "Confirm email"
5. For production, set up a proper email service:
   - Go to Settings > Email
   - Configure SMTP or use a service like SendGrid/Resend
        `
      });
    } catch (err: any) {
      setResult({
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getErrorSuggestion = (error: string) => {
    if (error.includes('Email rate limit exceeded')) {
      return 'Too many signup attempts. Wait a few minutes or use a different email.';
    }
    if (error.includes('User already registered')) {
      return 'This email is already registered. Try signing in instead.';
    }
    if (error.includes('Invalid email')) {
      return 'Please enter a valid email address.';
    }
    return 'Check Supabase dashboard email settings.';
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Email Auth Diagnostic Tool</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Test Credentials</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                placeholder="test@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                placeholder="Password123!"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={testSignUp}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Test Sign Up
          </button>
          
          <button
            onClick={testSignIn}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Test Sign In
          </button>
          
          <button
            onClick={checkSupabaseSettings}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Check Settings
          </button>
        </div>

        {loading && (
          <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-blue-300">Testing...</p>
          </div>
        )}

        {result && (
          <div className={`rounded-lg p-4 ${
            result.success ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'
          }`}>
            <pre className="text-white text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
          <h3 className="text-yellow-300 font-semibold mb-2">Quick Fix Instructions:</h3>
          <ol className="text-yellow-200 text-sm space-y-2 list-decimal list-inside">
            <li>Go to your Supabase Dashboard</li>
            <li>Navigate to Authentication → Providers → Email</li>
            <li>Turn OFF "Confirm email" for testing</li>
            <li>Or configure proper email service in Settings → Email</li>
            <li>For production, use SendGrid, Resend, or SMTP</li>
          </ol>
        </div>
      </div>
    </div>
  );
}