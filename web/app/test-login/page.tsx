'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TestLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-login with your credentials
    async function autoLogin() {
      try {
        console.log('Attempting auto-login...');
        
        // Get the current session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Already logged in, redirecting...');
          router.push('/dashboard');
          return;
        }

        // If no session, try to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'YOUR_EMAIL_HERE', // Replace with your email
          password: 'YOUR_PASSWORD_HERE' // Replace with your password
        });

        if (error) {
          console.error('Login error:', error);
          // Try direct navigation anyway
          router.push('/dashboard');
        } else {
          console.log('Login successful:', data);
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Auto-login failed:', err);
        // Navigate to dashboard anyway
        router.push('/dashboard');
      }
    }

    autoLogin();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Testing Login...</h1>
        <p className="text-gray-400">Attempting to log you in automatically...</p>
        <div className="mt-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Go to Dashboard Directly
          </button>
        </div>
      </div>
    </div>
  );
}