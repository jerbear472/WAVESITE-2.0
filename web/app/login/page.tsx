'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import WaveSightLogo from '@/components/WaveSightLogo';
import Header from '@/components/Header';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    // Check for confirmation success
    if (searchParams?.get('confirmed') === 'true') {
      setSuccessMessage('Email confirmed successfully! You can now log in.');
    }
    // Check for custom message
    const message = searchParams?.get('message');
    if (message) {
      setSuccessMessage(message);
    }
    // Check for errors
    const error = searchParams?.get('error');
    if (error === 'callback_failed') {
      setError('Authentication failed. Please try again.');
    } else if (error === 'confirmation_failed') {
      setError('Email confirmation failed. The link may be expired or invalid.');
    } else if (error) {
      setError(decodeURIComponent(error));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LOGIN PAGE] Form submitted');
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }
    
    setError('');
    setShowTimeout(false);
    setLoading(true);
    console.log('[LOGIN PAGE] Attempting login with email:', formData.email);

    // Set timeout warning after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);

    try {
      await login(formData.email, formData.password);
      console.log('[LOGIN PAGE] Login successful, redirecting...');
      
      // Clear timeout warning
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Small delay to ensure session is set
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const from = searchParams?.get('from') || '/dashboard';
      console.log('[LOGIN PAGE] Redirecting to:', from);
      
      router.push(from);
    } catch (err: any) {
      console.error('[LOGIN PAGE] Login error:', err.message);
      
      // Clear timeout warning
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Check for specific error types
      if (err.message?.includes('timeout')) {
        setError('Connection timeout. Please check your internet connection and try again.');
        setRetryCount(prev => prev + 1);
      } else if (err.message?.includes('Invalid email or password')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.message?.includes('confirm your email')) {
        setError('Please confirm your email address before logging in. Check your inbox for the confirmation email.');
      } else {
        setError(err.message || 'An error occurred during login. Please try again.');
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
      setShowTimeout(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setRetryCount(0);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex items-center justify-center px-4 pt-32 pb-20">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Welcome back</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to your account</p>
          </div>

          <div className="card">
            {successMessage && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {showTimeout && !error && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>This is taking longer than expected. Please wait...</span>
              </div>
            )}

            {error && (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
                {retryCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try again
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
            </form>
          </div>

          <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-wave-600 hover:text-wave-700 dark:text-wave-400 dark:hover:text-wave-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}