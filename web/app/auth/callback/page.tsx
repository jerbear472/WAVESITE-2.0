'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL params
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (code) {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) throw error;
          
          // Get the redirect URL or default to dashboard
          const redirectTo = params.get('redirect_to') || '/dashboard';
          router.push(redirectTo);
        } else {
          // No code found, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-wave-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}