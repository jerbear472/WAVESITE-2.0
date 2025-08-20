'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CommunityVerificationQueue from '@/components/CommunityVerificationQueue';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  Zap,
  Info
} from 'lucide-react';

interface VerificationStats {
  total_votes: number;
  correct_votes: number;
  accuracy: number;
  current_streak: number;
  best_streak: number;
  xp_earned_from_voting: number;
  predictions_verified_today: number;
  reliability_tier: string;
}

export default function VerifyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<VerificationStats>({
    total_votes: 0,
    correct_votes: 0,
    accuracy: 0,
    current_streak: 0,
    best_streak: 0,
    xp_earned_from_voting: 0,
    predictions_verified_today: 0,
    reliability_tier: 'standard'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchVerificationStats();
    }
  }, [user]);

  const fetchVerificationStats = async () => {
    try {
      // Get user's verification history
      const { data: reliability } = await supabase
        .from('user_reliability')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Get today's verification count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayVotes } = await supabase
        .from('verification_votes')
        .select('id')
        .eq('voter_id', user?.id)
        .gte('voted_at', today.toISOString());

      // Calculate XP earned from voting
      const xpFromVoting = (reliability?.correct_verification_votes || 0) * 5;

      setStats({
        total_votes: reliability?.total_verification_votes || 0,
        correct_votes: reliability?.correct_verification_votes || 0,
        accuracy: reliability?.reliability_score || 50,
        current_streak: reliability?.current_correct_streak || 0,
        best_streak: reliability?.best_correct_streak || 0,
        xp_earned_from_voting: xpFromVoting,
        predictions_verified_today: todayVotes?.length || 0,
        reliability_tier: reliability?.reliability_tier || 'standard'
      });
    } catch (error) {
      console.error('Error fetching verification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'expert': return 'text-purple-400 bg-purple-900/20 border-purple-800';
      case 'trusted': return 'text-blue-400 bg-blue-900/20 border-blue-800';
      case 'standard': return 'text-green-400 bg-green-900/20 border-green-800';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Verification Center</h1>
              <p className="text-gray-400">
                Help verify trend predictions and earn XP while improving your reliability score
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl p-6 border border-blue-800/30 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">How Verification Works</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• When predictions expire, they need verification to determine if they were correct</p>
                <p>• Major trends are auto-verified with Google Trends data (when available)</p>
                <p>• Niche trends need 5 community votes to reach consensus (60% agreement)</p>
                <p>• Vote accurately with the majority to increase your reliability score</p>
                <p>• Higher reliability = more voting power & better rewards</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total_votes}</p>
              <p className="text-xs text-gray-400 mt-1">Votes Cast</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900 rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <span className="text-xs text-gray-500">Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-white">{Math.round(stats.accuracy)}%</p>
              <p className="text-xs text-gray-400 mt-1">Reliability Score</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-xs text-gray-500">Earned</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.xp_earned_from_voting}</p>
              <p className="text-xs text-gray-400 mt-1">XP from Voting</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-xl p-4 border ${getTierColor(stats.reliability_tier)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5" />
                <span className="text-xs opacity-70">Tier</span>
              </div>
              <p className="text-lg font-bold capitalize">{stats.reliability_tier}</p>
              <p className="text-xs opacity-70 mt-1">Verifier Level</p>
            </motion.div>
          </div>
        )}

        {/* Verification Queue */}
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
          <CommunityVerificationQueue />
        </div>

        {/* Tips Section */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
            <h4 className="text-white font-medium mb-1">What "Peaked" Means</h4>
            <p className="text-sm text-gray-400">
              Maximum engagement reached, mainstream adoption, saturation visible, declining interest
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <TrendingUp className="w-6 h-6 text-blue-400 mb-2" />
            <h4 className="text-white font-medium mb-1">Still Growing</h4>
            <p className="text-sm text-gray-400">
              Engagement increasing, new audiences joining, creators still innovating
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <Clock className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="text-white font-medium mb-1">Vote Carefully</h4>
            <p className="text-sm text-gray-400">
              Your reliability score affects vote weight. Accurate votes = more influence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}