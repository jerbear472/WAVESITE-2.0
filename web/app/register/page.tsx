'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import WaveLogo from '@/components/WaveLogo';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
      
      // Check if email confirmation is needed
      if (result?.needsEmailConfirmation) {
        setShowConfirmation(true);
      } else {
        // Email confirmation disabled, redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <svg className="w-full h-full" viewBox="0 0 1440 800">
            <path
              fill="url(#gradient1)"
              fillOpacity="0.3"
              d="M0,320L48,309.3C96,299,192,277,288,277.3C384,277,480,299,576,304C672,309,768,299,864,282.7C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
              className="animate-wave"
            />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0080ff" />
                <stop offset="100%" stopColor="#0066cc" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="wave-card p-8 max-w-md w-full mx-4 relative z-10"
      >
        {showConfirmation ? (
          <div className="text-center">
            <WaveLogo size={80} animated={true} className="mx-auto mb-4" />
            <h1 className="text-3xl font-bold wave-text-gradient mb-4">Check Your Email!</h1>
            <div className="bg-wave-800/50 rounded-lg p-6 mb-6">
              <p className="text-wave-200 mb-4">
                We've sent a confirmation email to <strong className="text-wave-100">{formData.email}</strong>
              </p>
              <p className="text-wave-300 text-sm">
                Click the link in the email to confirm your account and start spotting trends!
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-wave-400 text-sm">
                Didn't receive the email? Check your spam folder or
              </p>
              <button
                onClick={() => setShowConfirmation(false)}
                className="text-wave-300 hover:text-wave-200 underline text-sm"
              >
                Try registering again
              </button>
              <div className="mt-6">
                <Link href="/login" className="text-wave-300 hover:text-wave-200 font-medium">
                  Go to login page →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <WaveLogo size={80} animated={true} className="mx-auto mb-4" />
              <h1 className="text-3xl font-bold wave-text-gradient">Join WaveSite</h1>
              <p className="text-wave-300 mt-2">Start spotting trends before they break</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-wave-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:outline-none focus:border-wave-500 focus:ring-2 focus:ring-wave-500/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-wave-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:outline-none focus:border-wave-500 focus:ring-2 focus:ring-wave-500/20"
              placeholder="trendspotter"
              pattern="[a-zA-Z0-9_]+"
              title="Username can only contain letters, numbers, and underscores"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-wave-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:outline-none focus:border-wave-500 focus:ring-2 focus:ring-wave-500/20"
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-wave-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-wave-800/50 border border-wave-700/30 text-white placeholder-wave-500 focus:outline-none focus:border-wave-500 focus:ring-2 focus:ring-wave-500/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full wave-button py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-wave-400">
                Already have an account?{' '}
                <Link href="/login" className="text-wave-300 hover:text-wave-200 font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-wave-700/30">
              <p className="text-xs text-wave-500 text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}