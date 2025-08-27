'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { Flame, TrendingDown, Skull, Waves } from 'lucide-react';

interface SimpleVoteDisplayProps {
  trendId: string;
  initialVotes?: {
    wave: number;
    fire: number;
    declining: number;
    dead: number;
  };
  compact?: boolean;
}

const VOTE_OPTIONS = [
  {
    type: 'wave',
    icon: <Waves className="w-4 h-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200',
    value: 2,
  },
  {
    type: 'fire',
    icon: <Flame className="w-4 h-4" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    borderColor: 'border-orange-200',
    value: 1,
  },
  {
    type: 'declining',
    icon: <TrendingDown className="w-4 h-4" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100',
    borderColor: 'border-yellow-200',
    value: -1,
  },
  {
    type: 'dead',
    icon: <Skull className="w-4 h-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    borderColor: 'border-gray-200',
    value: -2,
  }
];

export default function SimpleVoteDisplay({ 
  trendId, 
  initialVotes = { wave: 0, fire: 0, declining: 0, dead: 0 },
  compact = false
}: SimpleVoteDisplayProps) {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  
  const [userVote, setUserVote] = useState<string | null>(null);
  const [votes, setVotes] = useState(initialVotes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && trendId) {
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
        setVotes({
          wave: data.wave_votes || 0,
          fire: data.fire_votes || 0,
          declining: data.declining_votes || 0,
          dead: data.dead_votes || 0
        });

        // Show XP notification
        if (data.xp_earned && showXPNotification) {
          showXPNotification(data.xp_earned, `Voted: ${voteType}`);
        }
      }
    } catch (error) {
      console.error('Error casting vote:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = (votes?.wave || 0) + (votes?.fire || 0) + (votes?.declining || 0) + (votes?.dead || 0);

  if (compact) {
    // Compact inline display
    return (
      <div className="flex items-center gap-2">
        {VOTE_OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => handleVote(option.type)}
            disabled={loading}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              userVote === option.type 
                ? `${option.bgColor} ${option.borderColor} border-2` 
                : 'bg-gray-50 hover:bg-gray-100'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={option.color}>{option.icon}</span>
            <span className="text-gray-700">{votes[option.type as keyof typeof votes] || 0}</span>
          </button>
        ))}
      </div>
    );
  }

  // Full display
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {VOTE_OPTIONS.map((option) => (
          <motion.button
            key={option.type}
            onClick={() => handleVote(option.type)}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              userVote === option.type 
                ? `${option.bgColor} ${option.borderColor} border-2 shadow-sm` 
                : 'bg-white hover:bg-gray-50 border border-gray-200'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={option.color}>{option.icon}</span>
            <span className="text-sm font-medium text-gray-700">
              {votes[option.type as keyof typeof votes] || 0}
            </span>
            {userVote === option.type && (
              <span className="text-xs text-gray-500">✓</span>
            )}
          </motion.button>
        ))}
      </div>
      
      {totalVotes > 0 && (
        <div className="text-xs text-gray-500">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </div>
      )}
    </div>
  );
}