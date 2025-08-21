'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp } from 'lucide-react';

export default function BankPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 shadow-xl text-center"
      >
        <div className="mb-6">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment System Retired</h1>
          <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">This feature is no longer available</p>
          </div>
        </div>

        <div className="space-y-4 text-gray-300">
          <p>
            WaveSight has transitioned to an XP-based reward system!
          </p>
          <p>
            You now earn XP points for spotting trends, which help you level up and unlock new features.
          </p>
          <div className="pt-4 border-t border-gray-600">
            <p className="text-sm text-gray-400">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>

        <motion.div
          className="mt-6 h-2 bg-gray-700 rounded-full overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }}
        >
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" />
        </motion.div>
      </motion.div>
    </div>
  );
}