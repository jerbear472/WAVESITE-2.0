'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL params
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const token_hash = params.get('token_hash');
        const type = params.get('type');
        const error_description = params.get('error_description');
        
        // Check for errors first
        if (error_description) {
          throw new Error(error_description);
        }
        
        // Handle email confirmation (from confirmation link)
        if (token_hash && type === 'signup') {
          console.log('Processing email confirmation...');
          const { error } = await supabase.auth.verifyOtp({
            type: 'signup',
            token_hash,
          });
          
          if (error) throw error;
          
          setStatus('success');
          setMessage('Email confirmed successfully! Redirecting to login...');
          setTimeout(() => {
            router.push('/login?confirmed=true');
          }, 2000);
          return;
        }
        
        // Handle OAuth callback or magic link (with code)
        if (code) {
          console.log('Exchanging code for session...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) throw error;
          
          // Check if this is from email confirmation
          const isEmailConfirmation = params.get('type') === 'signup';
          
          if (isEmailConfirmation) {
            setStatus('success');
            setMessage('Email confirmed! Setting up your account...');
            // After email confirmation, go to dashboard
            setTimeout(() => {
              router.push('/predictions');
            }, 1500);
          } else {
            // Regular sign in
            const redirectTo = params.get('redirect_to') || '/predictions';
            router.push(redirectTo);
          }
          return;
        }
        
        // No valid params found - user may have navigated here directly
        console.log('No callback parameters found, redirecting to login');
        router.push('/login');
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Authentication failed');
        
        // Redirect to login with error after delay
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error.message || 'callback_failed')}`);
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-wave-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Processing authentication...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Error</h2>
            <p className="text-gray-400 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}