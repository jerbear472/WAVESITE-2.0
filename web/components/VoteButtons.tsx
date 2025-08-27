'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { Flame, TrendingDown, Skull, Waves, Sparkles } from 'lucide-react';

interface VoteButtonsProps {
  trendId: string;
  initialHeatScore?: number;
  initialVotes?: {
    wave: number;
    fire: number;
    declining: number;
    dead: number;
  };
  onVoteUpdate?: (data: any) => void;
}

interface VoteOption {
  type: 'wave' | 'fire' | 'declining' | 'dead';
  label: string;
  icon: React.ReactNode;
  value: number;
  color: string;
  bgGradient: string;
  hoverGradient: string;
}

const VOTE_OPTIONS: VoteOption[] = [
  {
    type: 'wave',
    label: 'Riding Wave',
    icon: <Waves className="w-5 h-5" />,
    value: 2,
    color: 'text-blue-600',
    bgGradient: 'from-blue-400 to-cyan-500',
    hoverGradient: 'hover:from-blue-500 hover:to-cyan-600'
  },
  {
    type: 'fire',
    label: 'On Fire',
    icon: <Flame className="w-5 h-5" />,
    value: 1,
    color: 'text-orange-600',
    bgGradient: 'from-orange-400 to-red-500',
    hoverGradient: 'hover:from-orange-500 hover:to-red-600'
  },
  {
    type: 'declining',
    label: 'Declining',
    icon: <TrendingDown className="w-5 h-5" />,
    value: -1,
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-400 to-amber-500',
    hoverGradient: 'hover:from-yellow-500 hover:to-amber-600'
  },
  {
    type: 'dead',
    label: 'Dead',
    icon: <Skull className="w-5 h-5" />,
    value: -2,
    color: 'text-gray-600',
    bgGradient: 'from-gray-400 to-gray-600',
    hoverGradient: 'hover:from-gray-500 hover:to-gray-700'
  }
];

export default function VoteButtons({ 
  trendId, 
  initialHeatScore = 0,
  initialVotes = { wave: 0, fire: 0, declining: 0, dead: 0 },
  onVoteUpdate 
}: VoteButtonsProps) {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  
  const [userVote, setUserVote] = useState<string | null>(null);
  const [heatScore, setHeatScore] = useState(initialHeatScore);
  const [votes, setVotes] = useState(initialVotes);
  const [loading, setLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState<string | null>(null);

  useEffect(() => {
    // Load user's existing vote
    if (user) {
      loadVoteData();
    }
  }, [user, trendId]);

  const loadVoteData = async () => {
    try {
      const response = await fetch(`/api/vote-trend?trend_id=${trendId}&user_id=${user?.id}`);
      const data = await response.json();
      
      if (data.user_vote) {
        setUserVote(data.user_vote);
      }
      
      setHeatScore(data.heat_score || 0);
      setVotes(data.vote_distribution || { wave: 0, fire: 0, declining: 0, dead: 0 });
    } catch (error) {
      console.error('Error loading vote data:', error);
    }
  };

  const handleVote = async (voteType: string) => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }

    if (loading) return;

    setLoading(true);
    setShowAnimation(voteType);

    try {
      const response = await fetch('/api/vote-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trend_id: trendId,
          vote_type: voteType,
          user_id: user.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setUserVote(voteType);
        setHeatScore(data.heat_score);
        setVotes({
          wave: data.wave_votes,
          fire: data.fire_votes,
          declining: data.declining_votes,
          dead: data.dead_votes
        });

        // Show XP notification
        if (data.xp_earned && showXPNotification) {
          showXPNotification(data.xp_earned, `Voted: ${voteType}`);
        }

        // Notify parent component
        if (onVoteUpdate) {
          onVoteUpdate(data);
        }
      }
    } catch (error) {
      console.error('Error casting vote:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setShowAnimation(null), 1000);
    }
  };

  const getHeatScoreColor = () => {
    if (heatScore >= 20) return 'text-blue-600'; // Wave territory
    if (heatScore >= 5) return 'text-orange-600'; // Fire zone
    if (heatScore >= -5) return 'text-gray-600'; // Neutral
    if (heatScore >= -19) return 'text-yellow-600'; // Declining
    return 'text-gray-800'; // Dead zone
  };

  const getHeatScoreEmoji = () => {
    if (heatScore >= 20) return '🌊';
    if (heatScore >= 5) return '🔥';
    if (heatScore >= -5) return '⚡';
    if (heatScore >= -19) return '📉';
    return '💀';
  };

  const totalVotes = (votes?.wave || 0) + (votes?.fire || 0) + (votes?.declining || 0) + (votes?.dead || 0);

  return (
    <div className="space-y-3">
      {/* Heat Score Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Heat Score</span>
          <motion.div
            key={heatScore}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1 font-bold text-lg ${getHeatScoreColor()}`}
          >
            <span>{getHeatScoreEmoji()}</span>
            <span>{heatScore > 0 ? '+' : ''}{heatScore}</span>
          </motion.div>
        </div>
        {totalVotes > 0 && (
          <span className="text-xs text-gray-500">{totalVotes} votes</span>
        )}
      </div>

      {/* Vote Buttons Grid */}
      <div className="grid grid-cols-2 gap-2">
        {VOTE_OPTIONS.map((option) => {
          const voteCount = votes[option.type as keyof typeof votes];
          const isUserVote = userVote === option.type;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <motion.button
              key={option.type}
              onClick={() => handleVote(option.type)}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-lg p-3 transition-all ${
                isUserVote
                  ? `bg-gradient-to-r ${option.bgGradient} text-white shadow-lg`
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Background fill based on vote percentage */}
              {!isUserVote && percentage > 0 && (
                <div
                  className="absolute inset-0 bg-gray-200 opacity-20"
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Vote animation */}
              <AnimatePresence>
                {showAnimation === option.type && (
                  <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute inset-0 bg-gradient-to-r ${option.bgGradient} rounded-full`}
                  />
                )}
              </AnimatePresence>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${isUserVote ? 'text-white' : option.color}`}>
                    {voteCount}
                  </span>
                  {percentage > 0 && (
                    <span className={isUserVote ? 'text-white/80' : 'text-gray-500'}>
                      ({percentage}%)
                    </span>
                  )}
                  {option.value > 0 ? (
                    <span className={`font-medium ${isUserVote ? 'text-white/80' : 'text-green-600'}`}>
                      +{option.value}
                    </span>
                  ) : (
                    <span className={`font-medium ${isUserVote ? 'text-white/80' : 'text-red-600'}`}>
                      {option.value}
                    </span>
                  )}
                </div>
              </div>

              {/* User indicator */}
              {isUserVote && (
                <div className="absolute top-1 right-1">
                  <Sparkles className="w-4 h-4 text-white/80" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* User vote indicator */}
      {userVote && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-gray-600 mt-2"
        >
          Your vote: <span className="font-medium">{VOTE_OPTIONS.find(o => o.type === userVote)?.label}</span>
        </motion.div>
      )}
    </div>
  );
}