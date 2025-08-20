'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  Award,
  AlertCircle,
  ChevronRight,
  Sparkles,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

interface PredictionToVerify {
  id: string;
  trend_title: string;
  trend_description: string;
  thumbnail_url: string;
  predicted_peak_timeframe: string;
  predicted_peak_date: string;
  prediction_made_at: string;
  predictor_username: string;
  predictor_avatar: string;
  vote_count: number;
  peaked_votes: number;
  growing_votes: number;
  died_votes: number;
  platform: string;
  category: string;
  trend_name: string;
}

interface UserReliability {
  reliability_score: number;
  reliability_tier: 'novice' | 'standard' | 'trusted' | 'expert';
  total_verification_votes: number;
  correct_verification_votes: number;
}

export default function CommunityVerificationQueue() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userReliability, setUserReliability] = useState<UserReliability | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchVerificationQueue();
      fetchUserReliability();
    }
  }, [user]);

  const fetchVerificationQueue = async () => {
    try {
      // Get predictions needing verification that user hasn't voted on
      const { data, error } = await supabase
        .from('verification_queue')
        .select('*')
        .lt('vote_count', 5) // Need more votes
        .order('predicted_peak_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      // Filter out predictions user has already voted on
      const { data: existingVotes } = await supabase
        .from('verification_votes')
        .select('prediction_id')
        .eq('voter_id', user?.id);

      const votedPredictionIds = new Set(existingVotes?.map(v => v.prediction_id) || []);
      const filteredPredictions = (data || []).filter(p => !votedPredictionIds.has(p.id));

      setPredictions(filteredPredictions);
    } catch (error) {
      console.error('Error fetching verification queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReliability = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('user_reliability')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserReliability(data);
    } else if (error?.code === 'PGRST116') {
      // No record yet - create default
      setUserReliability({
        reliability_score: 50,
        reliability_tier: 'standard',
        total_verification_votes: 0,
        correct_verification_votes: 0
      });
    }
  };

  const submitVote = async (predictionId: string, vote: string) => {
    if (!user?.id || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('verification_votes')
        .insert({
          prediction_id: predictionId,
          voter_id: user.id,
          vote,
          vote_reason: null
        });

      if (error) throw error;

      // Update local state
      setUserVotes(prev => ({ ...prev, [predictionId]: vote }));
      
      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Move to next prediction
        if (currentIndex < predictions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // Refresh queue when done
          fetchVerificationQueue();
          setCurrentIndex(0);
        }
      }, 1500);

    } catch (error) {
      console.error('Error submitting vote:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeframe = (timeframe: string) => {
    const map: Record<string, string> = {
      '24_hours': '24 hours',
      '3_days': '2-3 days',
      '1_week': '1 week',
      '2_weeks': '2 weeks',
      '1_month': '1 month',
      '3_months': '3 months',
      '6_months': '6 months',
      'already_peaked': 'Already peaked'
    };
    return map[timeframe] || timeframe;
  };

  const getDaysAgo = (date: string) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
        <p className="text-gray-400">No predictions need verification right now.</p>
        <p className="text-sm text-gray-500 mt-2">Check back later for more.</p>
      </div>
    );
  }

  const currentPrediction = predictions[currentIndex];

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Verification Queue</h2>
          <p className="text-gray-400 mt-1">Help verify trend predictions</p>
        </div>
        
        {userReliability && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Your Reliability</p>
              <div className="flex items-center gap-2">
                <Award className={`w-5 h-5 ${
                  userReliability.reliability_tier === 'expert' ? 'text-purple-400' :
                  userReliability.reliability_tier === 'trusted' ? 'text-blue-400' :
                  userReliability.reliability_tier === 'standard' ? 'text-green-400' :
                  'text-gray-400'
                }`} />
                <span className="text-lg font-semibold text-white">
                  {Math.round(userReliability.reliability_score)}%
                </span>
                <span className="text-xs text-gray-500 uppercase">
                  {userReliability.reliability_tier}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / predictions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Verification Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPrediction.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 overflow-hidden"
        >
          {/* Prediction Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                VERIFICATION NEEDED
              </span>
              <span className="text-sm text-gray-400">
                {currentIndex + 1} of {predictions.length}
              </span>
            </div>

            {/* Trend Info */}
            <div className="flex items-start gap-4">
              {currentPrediction.thumbnail_url && (
                <img
                  src={currentPrediction.thumbnail_url}
                  alt="Trend"
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  {currentPrediction.trend_title || currentPrediction.trend_name}
                </h3>
                {currentPrediction.trend_description && (
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {currentPrediction.trend_description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-gray-500">
                    Platform: {currentPrediction.platform}
                  </span>
                  <span className="text-xs text-gray-500">
                    Category: {currentPrediction.category}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Prediction Details */}
          <div className="p-6 bg-black/20">
            <div className="flex items-center gap-2 mb-4">
              <img
                src={currentPrediction.predictor_avatar || '/default-avatar.png'}
                alt={currentPrediction.predictor_username}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-gray-400">
                {currentPrediction.predictor_username} predicted:
              </span>
            </div>

            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">
                    Peaks in {formatTimeframe(currentPrediction.predicted_peak_timeframe)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Predicted {getDaysAgo(currentPrediction.prediction_made_at)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            {/* Expiry Info */}
            <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-300 font-medium">
                    Prediction expired {getDaysAgo(currentPrediction.predicted_peak_date)}
                  </p>
                  <p className="text-blue-400/70 mt-1">
                    Based on what you've observed, did this trend peak around that time?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Options */}
          <div className="p-6">
            <p className="text-sm text-gray-400 mb-4">Based on what you've seen, did this trend peak?</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => submitVote(currentPrediction.id, 'peaked')}
                disabled={submitting}
                className="p-4 rounded-xl bg-green-900/20 hover:bg-green-900/30 border border-green-800/30 hover:border-green-700/50 transition-all group"
              >
                <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-medium">Yes, it peaked</p>
                <p className="text-xs text-green-400/60 mt-1">Hit maximum & declining</p>
              </button>

              <button
                onClick={() => submitVote(currentPrediction.id, 'still_growing')}
                disabled={submitting}
                className="p-4 rounded-xl bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/30 hover:border-blue-700/50 transition-all group"
              >
                <TrendingUp className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-400 font-medium">Still growing</p>
                <p className="text-xs text-blue-400/60 mt-1">Not peaked yet</p>
              </button>

              <button
                onClick={() => submitVote(currentPrediction.id, 'died')}
                disabled={submitting}
                className="p-4 rounded-xl bg-red-900/20 hover:bg-red-900/30 border border-red-800/30 hover:border-red-700/50 transition-all group"
              >
                <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 font-medium">It died</p>
                <p className="text-xs text-red-400/60 mt-1">Never really took off</p>
              </button>

              <button
                onClick={() => submitVote(currentPrediction.id, 'not_sure')}
                disabled={submitting}
                className="p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600/50 transition-all group"
              >
                <HelpCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 font-medium">Not sure</p>
                <p className="text-xs text-gray-500 mt-1">Skip this one</p>
              </button>
            </div>

            {/* Current Votes Display */}
            {currentPrediction.vote_count > 0 && (
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Current votes:</p>
                <div className="flex items-center gap-4 text-xs">
                  {currentPrediction.peaked_votes > 0 && (
                    <span className="text-green-400">
                      Peaked: {currentPrediction.peaked_votes}
                    </span>
                  )}
                  {currentPrediction.growing_votes > 0 && (
                    <span className="text-blue-400">
                      Growing: {currentPrediction.growing_votes}
                    </span>
                  )}
                  {currentPrediction.died_votes > 0 && (
                    <span className="text-red-400">
                      Died: {currentPrediction.died_votes}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {5 - currentPrediction.vote_count} more votes needed for consensus
                </p>
              </div>
            )}
          </div>

          {/* Skip Button */}
          <div className="px-6 pb-6">
            <button
              onClick={() => {
                if (currentIndex < predictions.length - 1) {
                  setCurrentIndex(prev => prev + 1);
                } else {
                  fetchVerificationQueue();
                  setCurrentIndex(0);
                }
              }}
              disabled={submitting}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Skip to next →
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Success Animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-green-500 text-white px-6 py-3 rounded-full flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Vote submitted! +5 XP</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}