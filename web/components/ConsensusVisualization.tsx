'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getRealtimeConsensus } from '@/lib/validationService';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Activity,
  BarChart3,
  Gauge
} from 'lucide-react';

interface ConsensusData {
  weightedScore: number;
  totalWeight: number;
  voteCount: number;
  confidenceAvg: number;
  votingVelocity: number;
  estimatedTimeToDecision: number | null;
}

interface Props {
  trendId: string;
  onConsensusReached?: (consensus: 'trending' | 'not_trending') => void;
}

export const ConsensusVisualization: React.FC<Props> = ({ trendId, onConsensusReached }) => {
  const [consensus, setConsensus] = useState<ConsensusData>({
    weightedScore: 0,
    totalWeight: 0,
    voteCount: 0,
    confidenceAvg: 0,
    votingVelocity: 0,
    estimatedTimeToDecision: null
  });
  const [recentVotes, setRecentVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    loadConsensusData();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`consensus-${trendId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trend_validations',
          filter: `trend_id=eq.${trendId}`
        },
        (payload) => {
          // Update consensus when new vote comes in
          loadConsensusData();
          
          // Add to recent votes
          setRecentVotes(prev => [{
            ...payload.new,
            isNew: true
          }, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [trendId]);

  const loadConsensusData = async () => {
    try {
      const data = await getRealtimeConsensus(trendId);
      setConsensus(data);
      
      // Check if consensus reached
      if (data.voteCount >= 15) {
        if (data.weightedScore >= 0.7) {
          onConsensusReached?.('trending');
        } else if (data.weightedScore <= -0.5) {
          onConsensusReached?.('not_trending');
        }
      }
      
      // Load recent votes
      const { data: votes } = await supabase
        .from('trend_validations')
        .select(`
          *,
          validator:profiles!validator_id(username, validation_reputation)
        `)
        .eq('trend_id', trendId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setRecentVotes(votes || []);
    } catch (error) {
      console.error('Error loading consensus:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    const normalized = (score + 1) * 50; // Convert -1 to 1 range to 0-100
    if (normalized >= 70) return 'text-green-400';
    if (normalized >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    const normalized = (score + 1) * 50;
    if (normalized >= 70) return 'from-green-500 to-emerald-600';
    if (normalized >= 40) return 'from-yellow-500 to-amber-600';
    return 'from-red-500 to-rose-600';
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const scorePercentage = (consensus.weightedScore + 1) * 50;
  const threshold = 70; // 70% for trending

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Live Consensus
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>{consensus.voteCount} validators</span>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="relative">
        <div className="text-center mb-4">
          <motion.div
            key={scorePercentage}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`text-5xl font-bold ${getScoreColor(consensus.weightedScore)}`}
          >
            {scorePercentage.toFixed(0)}%
          </motion.div>
          <p className="text-sm text-gray-400 mt-1">Weighted Consensus Score</p>
        </div>

        {/* Progress Bar */}
        <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getScoreGradient(consensus.weightedScore)}`}
            initial={{ width: 0 }}
            animate={{ width: `${scorePercentage}%` }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Threshold Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/50"
            style={{ left: `${threshold}%` }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
              Trending threshold
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 text-center">
          {consensus.voteCount < 5 ? (
            <span className="text-sm text-gray-400">Gathering initial votes...</span>
          ) : scorePercentage >= threshold ? (
            <span className="text-sm text-green-400 flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending consensus forming
            </span>
          ) : scorePercentage <= 30 ? (
            <span className="text-sm text-red-400 flex items-center justify-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Not trending consensus forming
            </span>
          ) : (
            <span className="text-sm text-yellow-400">Mixed opinions</span>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Avg Confidence</span>
            <Gauge className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-lg font-semibold text-white mt-1">
            {(consensus.confidenceAvg * 100).toFixed(0)}%
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Vote Velocity</span>
            <BarChart3 className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-lg font-semibold text-white mt-1">
            {consensus.votingVelocity.toFixed(1)}/hr
          </p>
        </div>
      </div>

      {/* Time to Decision */}
      {consensus.estimatedTimeToDecision !== null && consensus.voteCount < 15 && (
        <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <Clock className="w-4 h-4" />
            <span>
              Est. {Math.ceil(consensus.estimatedTimeToDecision)} min to decision
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {15 - consensus.voteCount} more votes needed
          </p>
        </div>
      )}

      {/* Recent Votes */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Recent Votes</h4>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          <AnimatePresence>
            {recentVotes.map((vote, index) => (
              <motion.div
                key={vote.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between text-xs p-2 rounded ${
                  vote.isNew ? 'bg-blue-500/10' : 'bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    vote.vote === 'verify' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-gray-400">
                    @{vote.validator?.username || 'anonymous'}
                  </span>
                  {vote.validator?.validation_reputation > 0.8 && (
                    <span className="text-yellow-400">⭐</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span>{(vote.confidence_score * 100).toFixed(0)}%</span>
                  <span>•</span>
                  <span>
                    {new Date(vote.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Vote Distribution */}
      {consensus.voteCount > 0 && (
        <div className="pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <div className="text-green-400">
              Trending: {Math.round(((consensus.weightedScore + 1) / 2) * consensus.voteCount)}
            </div>
            <div className="text-red-400">
              Not Trending: {Math.round(((1 - consensus.weightedScore) / 2) * consensus.voteCount)}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};