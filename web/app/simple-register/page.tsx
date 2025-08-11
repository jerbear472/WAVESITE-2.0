'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SimpleRegister() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Check if environment variables are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Configuration Error</h2>
          <p className="text-red-600">
            Supabase environment variables are not configured. 
            Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        </div>
      </div>
    );
  }
  
  const supabase = createClientComponentClient();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;
    const birthday = formData.get('birthday') as string;
    
    try {
      console.log('Registering with:', { email, username, birthday });
      
      // Step 1: Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            birthday
          }
        }
      });
      
      if (authError) {
        throw authError;
      }
      
      console.log('Auth response:', authData);
      
      if (authData.user) {
        // Wait for trigger
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile was created
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        if (profileError) {
          console.error('Profile check error:', profileError);
          
          // Try to create manually
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              email,
              username,
              birthday,
              age_verified: true
            });
          
          if (insertError) {
            console.error('Manual insert error:', insertError);
          }
        } else {
          console.log('Profile found:', profile);
        }
        
        setMessage(`✅ Account created successfully! User ID: ${authData.user.id}`);
      } else {
        setMessage('✅ Account created! Please check your email to confirm.');
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Registration Test</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full p-3 rounded bg-gray-800 text-white"
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <label htmlFor="username" className="block mb-2">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              className="w-full p-3 rounded bg-gray-800 text-white"
              placeholder="testuser"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block mb-2">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={8}
              className="w-full p-3 rounded bg-gray-800 text-white"
              placeholder="********"
            />
          </div>
          
          <div>
            <label htmlFor="birthday" className="block mb-2">Birthday</label>
            <input
              type="date"
              id="birthday"
              name="birthday"
              required
              className="w-full p-3 rounded bg-gray-800 text-white"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        {error && (
          <div className="mt-4 p-4 bg-red-900 rounded">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}
        
        {message && (
          <div className="mt-4 p-4 bg-green-900 rounded">
            <p className="text-green-300">{message}</p>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-gray-800 rounded">
          <h2 className="font-semibold mb-2">Debug Info:</h2>
          <p className="text-sm">Open browser console to see detailed logs</p>
          <p className="text-sm mt-2">This page:</p>
          <ul className="text-sm list-disc list-inside">
            <li>Creates auth user with Supabase</li>
            <li>Checks if profile was created</li>
            <li>Attempts manual creation if needed</li>
            <li>Shows all errors clearly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}