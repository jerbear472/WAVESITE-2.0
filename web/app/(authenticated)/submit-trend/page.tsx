'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import TrendSubmissionFormV2 from '@/components/TrendSubmissionFormV2';
import { TrendSubmissionV2Service } from '@/services/TrendSubmissionV2Service';
import { 
  TrendingUp as TrendingUpIcon,
  Zap as ZapIcon,
  Trophy as TrophyIcon,
  Link as LinkIcon,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubmitTrendPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (data: any) => {
    if (!user?.id) {
      showError('Authentication required', 'Please log in to submit trends');
      router.push('/login');
      return;
    }

    const result = await TrendSubmissionV2Service.submitTrend(user.id, data);
    
    if (result.success) {
      showSuccess(
        `Trend submitted! +${result.xp} XP`,
        'Your trend is being processed and will appear in the feed soon'
      );
      setShowForm(false);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } else {
      showError('Submission failed', result.error || 'Please try again');
    }
  };

  if (showForm) {
    return (
      <TrendSubmissionFormV2
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-wave-900 via-black to-wave-900 p-4">
      <div className="max-w-4xl mx-auto py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-wave-500/20 to-wave-600/20 rounded-2xl">
              <TrendingUpIcon className="w-16 h-16 text-wave-400" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Submit a Trend
          </h1>
          
          <p className="text-xl text-wave-300 mb-2">
            Spot trends early. Track their evolution. Earn rewards.
          </p>
          
          <p className="text-wave-400 max-w-2xl mx-auto">
            Our enhanced submission system tracks trend lifecycles, evolution chains, 
            and predictions to provide deeper market intelligence.
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="wave-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-wave-500/20 rounded-lg">
                  <LinkIcon className="w-6 h-6 text-wave-400" />
                </div>
                <h3 className="font-semibold text-white">1. Paste URL</h3>
              </div>
              <p className="text-wave-400 text-sm">
                Drop a link from TikTok, Twitter/X, YouTube, Reddit, or Instagram. 
                We'll auto-extract preview and metadata.
              </p>
            </div>

            <div className="wave-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-wave-500/20 rounded-lg">
                  <ZapIcon className="w-6 h-6 text-wave-400" />
                </div>
                <h3 className="font-semibold text-white">2. Add Context</h3>
              </div>
              <p className="text-wave-400 text-sm">
                Tell us the lifecycle stage, trend type, and optionally add predictions 
                and evolution tracking for bonus XP.
              </p>
            </div>

            <div className="wave-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-wave-500/20 rounded-lg">
                  <TrophyIcon className="w-6 h-6 text-wave-400" />
                </div>
                <h3 className="font-semibold text-white">3. Earn XP</h3>
              </div>
              <p className="text-wave-400 text-sm">
                Base submission earns 25 XP. Add evolution chains (+50-500 XP), 
                predictions (+20 XP), and insights (+5 XP).
              </p>
            </div>
          </div>
        </motion.div>

        {/* XP Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="wave-card p-8 mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6">XP Rewards System</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-wave-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Base Submission</p>
                <p className="text-sm text-wave-400">URL + Lifecycle + Type</p>
              </div>
              <span className="text-wave-300 font-bold">+25 XP</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-wave-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Evolution Tracking</p>
                <p className="text-sm text-wave-400">Link to parent trends</p>
              </div>
              <span className="text-wave-300 font-bold">+50-500 XP</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-wave-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Predictions</p>
                <p className="text-sm text-wave-400">Peak date, next platform, lifespan</p>
              </div>
              <span className="text-wave-300 font-bold">+20 XP</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-wave-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Context Note</p>
                <p className="text-sm text-wave-400">Add insights (280 chars)</p>
              </div>
              <span className="text-wave-300 font-bold">+5 XP</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-wave-600/20 to-wave-500/20 rounded-lg">
            <p className="text-wave-200 font-medium">
              Maximum possible: <span className="text-white font-bold">550 XP</span> per submission
            </p>
          </div>
        </motion.div>

        {/* New Features */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          <div className="wave-card p-6">
            <h3 className="text-lg font-semibold text-white mb-3">🔄 Lifecycle Tracking</h3>
            <p className="text-wave-400 text-sm mb-3">
              Identify where a trend is in its journey:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-wave-300">Just Starting - First 24-48 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-wave-300">Picking Up - Gaining momentum</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span className="text-wave-300">Going Viral - Peak growth</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-wave-300">Declining - Past peak</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-wave-300">Dead - No longer trending</span>
              </div>
            </div>
          </div>

          <div className="wave-card p-6">
            <h3 className="text-lg font-semibold text-white mb-3">🧬 Evolution Chains</h3>
            <p className="text-wave-400 text-sm mb-3">
              Track how trends mutate and spread:
            </p>
            <div className="pl-4 border-l-2 border-wave-700 space-y-3">
              <div>
                <p className="text-wave-200 font-medium text-sm">Original Trend</p>
                <p className="text-wave-500 text-xs">Stanley Cup craze</p>
              </div>
              <div>
                <p className="text-wave-200 font-medium text-sm">↓ Evolved Into</p>
                <p className="text-wave-500 text-xs">Stanley Cup accessories trend</p>
              </div>
              <div>
                <p className="text-wave-200 font-medium text-sm">↓ Mutated To</p>
                <p className="text-wave-500 text-xs">Anti-consumption backlash</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={() => setShowForm(true)}
            className="group px-8 py-4 bg-gradient-to-r from-wave-500 to-wave-600 hover:from-wave-400 hover:to-wave-500 rounded-xl font-semibold text-white transition-all transform hover:scale-105 shadow-lg hover:shadow-wave-500/25 inline-flex items-center gap-3"
          >
            <TrendingUpIcon className="w-5 h-5" />
            Submit a Trend
            <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-wave-400 text-sm mt-4">
            Quick submission • Auto-extraction • Instant XP
          </p>
        </motion.div>
      </div>
    </div>
  );
}