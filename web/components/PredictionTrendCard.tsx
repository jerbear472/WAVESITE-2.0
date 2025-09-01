'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  BarChart3, 
  Target, 
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  ExternalLink,
  Brain
} from 'lucide-react';

interface TrendCardProps {
  trend: {
    id: string;
    title: string;
    description: string;
    platform: string;
    category: string;
    url?: string;
    thumbnail_url?: string;
    spotter_username: string;
    submitted_at: string;
    likes_count: number;
    comments_count: number;
    predictions_count: number;
    user_has_liked: boolean;
    user_has_predicted: boolean;
    wave_votes?: number;
    fire_votes?: number;
    declining_votes?: number;
    dead_votes?: number;
    wave_score?: number;
    is_validated?: boolean;
    status?: 'submitted' | 'approved' | 'rejected';
  };
  userVote?: string;
  onVote: (trendId: string, voteType: string) => void;
  onComment: (trend: any) => void;
  onPredict: (trend: any) => void;
  onStats?: (trend: any) => void;
  onAnalyze?: (trend: any) => void;
  index: number;
  isVoting?: boolean;
}

const VoteButton = ({ 
  type, 
  icon, 
  count, 
  isActive, 
  onClick, 
  gradient,
  isLoading 
}: {
  type: string;
  icon: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  gradient: string;
  isLoading?: boolean;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: isLoading ? 1 : 1.05 }}
    whileTap={{ scale: isLoading ? 1 : 0.95 }}
    disabled={isLoading}
    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
      isActive 
        ? `bg-gradient-to-r ${gradient} text-white shadow-md` 
        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
    } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
  >
    {isLoading ? (
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : (
      <span className="text-lg">{icon}</span>
    )}
    <span className="text-sm font-medium">{count}</span>
  </motion.button>
);

export default function PredictionTrendCard({ 
  trend, 
  userVote, 
  onVote, 
  onComment, 
  onPredict,
  onStats,
  onAnalyze,
  index,
  isVoting 
}: TrendCardProps) {
  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      tiktok: '🎵',
      instagram: '📸',
      twitter: '𝕏',
      reddit: '🔥',
      youtube: '📺',
      default: '🌐'
    };
    return emojis[platform?.toLowerCase()] || emojis.default;
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'submitted':
        return { label: 'Submitted', bgColor: 'bg-blue-100', textColor: 'text-blue-700', icon: '📝' };
      case 'approved':
        return { label: 'Validated', bgColor: 'bg-green-100', textColor: 'text-green-700', icon: '✓' };
      case 'rejected':
        return { label: 'Rejected', bgColor: 'bg-red-100', textColor: 'text-red-700', icon: '✗' };
      default:
        return null;
    }
  };

  const statusBadge = getStatusBadge(trend.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
    >
      {/* Card Header with Platform & Status */}
      <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getPlatformEmoji(trend.platform)}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{trend.title}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User className="w-3 h-3" />
                <span>{trend.spotter_username}</span>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(trend.submitted_at)}</span>
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          {statusBadge && (
            <div className="flex items-center">
              <span className={`px-3 py-1.5 ${statusBadge.bgColor} ${statusBadge.textColor} text-sm font-bold rounded-full flex items-center gap-1`}>
                <span>{statusBadge.icon}</span>
                <span>{statusBadge.label}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Clickable if URL exists */}
      <div 
        className={`p-6 transition-colors ${trend.url ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => {
          if (trend.url) {
            window.open(trend.url, '_blank', 'noopener,noreferrer');
          }
        }}
        title={trend.url ? 'Click to view source' : 'No source URL available'}
      >
        <div className="flex gap-6">
          {/* Thumbnail */}
          {trend.thumbnail_url && (
            <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              <img 
                src={trend.thumbnail_url} 
                alt={trend.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 space-y-4">
            <p className="text-gray-600 line-clamp-2">{trend.description}</p>
            
            {/* Category & Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                {trend.category}
              </span>
              {trend.url && (
                <ExternalLink className="w-4 h-4 text-gray-400" />
              )}
              {trend.wave_score !== undefined && trend.wave_score !== 0 && (
                <div className={`flex items-center gap-1 font-medium ${
                  trend.wave_score > 0 ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {trend.wave_score > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{trend.wave_score > 0 ? '+' : ''}{trend.wave_score}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voting Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {/* Vote Buttons */}
            <div className="flex gap-2">
              <VoteButton
                type="wave"
                icon="🌊"
                count={trend.wave_votes || 0}
                isActive={userVote === 'wave'}
                onClick={() => onVote(trend.id, 'wave')}
                gradient="from-blue-400 to-cyan-500"
                isLoading={isVoting}
              />
              <VoteButton
                type="fire"
                icon="🔥"
                count={trend.fire_votes || 0}
                isActive={userVote === 'fire'}
                onClick={() => onVote(trend.id, 'fire')}
                gradient="from-orange-400 to-red-500"
                isLoading={isVoting}
              />
              <VoteButton
                type="declining"
                icon="📉"
                count={trend.declining_votes || 0}
                isActive={userVote === 'declining'}
                onClick={() => onVote(trend.id, 'declining')}
                gradient="from-yellow-400 to-amber-500"
                isLoading={isVoting}
              />
              <VoteButton
                type="dead"
                icon="💀"
                count={trend.dead_votes || 0}
                isActive={userVote === 'dead'}
                onClick={() => onVote(trend.id, 'dead')}
                gradient="from-gray-400 to-gray-600"
                isLoading={isVoting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onComment(trend)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{trend.comments_count}</span>
              </button>

              <button
                onClick={() => onStats?.(trend)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                title="View all user activity on this trend"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Stats</span>
              </button>

              {onAnalyze && (
                <button
                  onClick={() => onAnalyze(trend)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg text-purple-700 hover:from-purple-200 hover:to-pink-200 transition-all"
                  title="AI Analysis"
                >
                  <Brain className="w-4 h-4" />
                  <span className="text-sm font-medium">Analyze</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Predict Button */}
        <div className="mt-4">
          {!trend.user_has_predicted ? (
            <motion.button
              onClick={() => onPredict(trend)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <Target className="w-4 h-4" />
              Predict Peak
            </motion.button>
          ) : (
            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Locked In
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}