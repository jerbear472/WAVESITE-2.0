'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  TrendingUp, 
  Flame, 
  TrendingDown, 
  Skull, 
  Bookmark,
  X,
  Heart,
  Share2,
  ExternalLink,
  Clock,
  User,
  Hash,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Trend {
  id: string;
  spotter_id: string;
  description: string;
  category: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  post_url?: string;
  evidence?: any;
  created_at: string;
  wave_votes?: number;
  fire_votes?: number;
  declining_votes?: number;
  dead_votes?: number;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  profiles?: {
    username: string;
  };
}

interface TrendSwipeStackProps {
  trends: Trend[];
  onVote?: (trendId: string, voteType: 'wave' | 'fire' | 'decline' | 'death') => void;
  onSave?: (trend: Trend, reaction: 'wave' | 'fire' | 'decline' | 'death' | null) => void;
  onRefresh?: () => void;
}

export default function TrendSwipeStack({ trends, onVote, onSave, onRefresh }: TrendSwipeStackProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState<Set<number>>(new Set());
  const [lastVote, setLastVote] = useState<{ trendId: string; vote: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTrends, setSavedTrends] = useState<Set<string>>(new Set());
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const currentTrend = trends[currentIndex];
  const nextTrend = trends[currentIndex + 1];

  // Vote thresholds for swipe distance
  const VOTE_THRESHOLD = 100; // pixels to trigger a vote
  const SUPER_VOTE_THRESHOLD = 200; // pixels for strong reaction

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const swipeDistance = Math.abs(info.offset.x);
    const swipeDirection = info.offset.x > 0 ? 'right' : 'left';
    
    if (swipeDistance > VOTE_THRESHOLD) {
      // Determine vote type based on direction and distance
      let voteType: 'wave' | 'fire' | 'decline' | 'death';
      
      if (swipeDirection === 'right') {
        voteType = swipeDistance > SUPER_VOTE_THRESHOLD ? 'wave' : 'fire';
      } else {
        voteType = swipeDistance > SUPER_VOTE_THRESHOLD ? 'death' : 'decline';
      }
      
      // Animate card out
      const exitX = swipeDirection === 'right' ? 1000 : -1000;
      
      // Apply vote
      await handleVote(voteType);
      
      // Move to next card
      setTimeout(() => {
        setRemovedCards(prev => new Set([...prev, currentIndex]));
        setCurrentIndex(prev => prev + 1);
        x.set(0);
        y.set(0);
      }, 200);
    } else {
      // Snap back to center
      x.set(0);
      y.set(0);
    }
  };

  const handleVote = async (voteType: 'wave' | 'fire' | 'decline' | 'death') => {
    if (!currentTrend || !user) return;
    
    try {
      // Update local state immediately for responsiveness
      setLastVote({ trendId: currentTrend.id, vote: voteType });
      
      // Record user vote in trend_user_votes table
      const { error: voteError } = await supabase
        .from('trend_user_votes')
        .upsert({
          user_id: user.id,
          trend_id: currentTrend.id,
          vote_type: voteType,
          voted_at: new Date().toISOString()
        });
      
      if (voteError) {
        console.error('Vote upsert error:', voteError);
        // Check if it's a duplicate vote error
        if (voteError.code === '23505') {
          // User already voted on this trend, update instead
          const { error: updateVoteError } = await supabase
            .from('trend_user_votes')
            .update({
              vote_type: voteType,
              voted_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('trend_id', currentTrend.id);
          
          if (updateVoteError) {
            console.error('Failed to update vote:', updateVoteError);
            throw updateVoteError;
          }
        } else {
          throw voteError;
        }
      }
      
      // Update vote count in trend_submissions
      const voteColumn = `${voteType}_votes`;
      const { error: updateError } = await supabase
        .from('trend_submissions')
        .update({ 
          [voteColumn]: (currentTrend[voteColumn as keyof Trend] as number || 0) + 1 
        })
        .eq('id', currentTrend.id);
      
      if (updateError) {
        console.error('Failed to update vote count:', updateError);
        // Don't throw here since the vote was recorded
      }
      
      // Show feedback
      const emojis = {
        wave: '🌊',
        fire: '🔥',
        decline: '📉',
        death: '💀'
      };
      
      showSuccess(`${emojis[voteType]} Voted!`);
      
      // Callback
      if (onVote) {
        onVote(currentTrend.id, voteType);
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('voted_at')) {
        showError('Database error: Please refresh and try again');
      } else if (error.message?.includes('authentication')) {
        showError('Session expired: Please refresh the page');
      } else {
        showError('Failed to record vote');
      }
    }
  };

  const handleButtonVote = async (voteType: 'wave' | 'fire' | 'decline' | 'death') => {
    await handleVote(voteType);
    
    // Animate and move to next
    const exitX = voteType === 'wave' || voteType === 'fire' ? 1000 : -1000;
    x.set(exitX);
    
    setTimeout(() => {
      setRemovedCards(prev => new Set([...prev, currentIndex]));
      setCurrentIndex(prev => prev + 1);
      x.set(0);
      y.set(0);
    }, 200);
  };

  const handleSave = async () => {
    if (!currentTrend || !user || isSaving) return;
    
    const isSaved = savedTrends.has(currentTrend.id);
    setIsSaving(true);
    
    try {
      if (isSaved) {
        // Unsave the trend
        const { error } = await supabase
          .from('saved_trends')
          .delete()
          .eq('user_id', user.id)
          .eq('trend_id', currentTrend.id);
        
        if (error) throw error;
        
        setSavedTrends(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentTrend.id);
          return newSet;
        });
        
        showSuccess('❌ Removed from timeline');
      } else {
        // Save to user's saved trends
        const { error } = await supabase
          .from('saved_trends')
          .insert({
            user_id: user.id,
            trend_id: currentTrend.id,
            reaction: lastVote?.trendId === currentTrend.id ? lastVote.vote : null,
            saved_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        setSavedTrends(prev => new Set([...prev, currentTrend.id]));
        showSuccess('📌 Saved to your timeline!');
        
        // Callback
        if (onSave) {
          const reaction = lastVote?.trendId === currentTrend.id ? 
            lastVote.vote as 'wave' | 'fire' | 'decline' | 'death' : null;
          onSave(currentTrend, reaction);
        }
      }
    } catch (error: any) {
      if (error.code === '23505') {
        setSavedTrends(prev => new Set([...prev, currentTrend.id]));
        showError('Already saved to timeline');
      } else {
        console.error('Error saving trend:', error);
        showError('Failed to save trend');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Get vote indicator color
  const getVoteColor = (x: number) => {
    if (Math.abs(x) < VOTE_THRESHOLD) return 'transparent';
    
    if (x > 0) {
      return x > SUPER_VOTE_THRESHOLD ? '#3B82F6' : '#EF4444'; // Blue for wave, Red for fire
    } else {
      return x < -SUPER_VOTE_THRESHOLD ? '#6B7280' : '#F59E0B'; // Gray for death, Amber for decline
    }
  };

  const voteIndicatorColor = useTransform(x, (value) => getVoteColor(value));
  
  // Get vote label - using state instead of transform for TypeScript compatibility
  const [voteLabel, setVoteLabel] = useState('');
  
  useEffect(() => {
    const unsubscribe = x.on('change', (value) => {
      if (Math.abs(value) < VOTE_THRESHOLD) {
        setVoteLabel('');
      } else if (value > 0) {
        setVoteLabel(value > SUPER_VOTE_THRESHOLD ? '🌊 WAVE' : '🔥 FIRE');
      } else {
        setVoteLabel(value < -SUPER_VOTE_THRESHOLD ? '💀 DEATH' : '📉 DECLINE');
      }
    });
    
    return unsubscribe;
  }, [x]);

  if (currentIndex >= trends.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">You've seen all trends!</h2>
        <p className="text-gray-600 mb-6">Check back later for more</p>
        <button
          onClick={onRefresh}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          Refresh Trends
        </button>
      </div>
    );
  }

  if (!currentTrend) return null;

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Stack indicator */}
      <div className="flex justify-center gap-1 mb-4">
        {trends.slice(0, 5).map((_, idx) => (
          <div
            key={idx}
            className={`h-1 rounded-full transition-all ${
              idx === currentIndex 
                ? 'w-8 bg-blue-500' 
                : idx < currentIndex 
                  ? 'w-2 bg-gray-300'
                  : 'w-2 bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Card stack */}
      <div className="relative h-[600px] perspective-1000">
        {/* Next card (underneath) */}
        {nextTrend && (
          <div className="absolute inset-0 scale-95 opacity-50">
            <div className="w-full h-full bg-white rounded-2xl shadow-lg" />
          </div>
        )}

        {/* Current card */}
        <AnimatePresence>
          {!removedCards.has(currentIndex) && (
            <motion.div
              key={currentTrend.id}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              style={{
                x,
                y,
                rotate,
                opacity
              }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ 
                x: x.get() > 0 ? 1000 : -1000,
                opacity: 0,
                transition: { duration: 0.3 }
              }}
            >
              {/* Vote indicator overlay */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                style={{
                  backgroundColor: voteIndicatorColor,
                  opacity: 0.2
                }}
              />
              
              {/* Vote label */}
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                style={{
                  opacity: useTransform(x, [-200, -100, 0, 100, 200], [1, 0, 0, 0, 1])
                }}
              >
                <div className="text-4xl font-bold text-white drop-shadow-lg">
                  {voteLabel}
                </div>
              </motion.div>

              {/* Card content */}
              <div className="w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Image section */}
                {(currentTrend.screenshot_url || currentTrend.thumbnail_url) && (
                  <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    <img
                      src={currentTrend.screenshot_url || currentTrend.thumbnail_url || ''}
                      alt="Trend"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', e.currentTarget.src);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {/* Category badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {currentTrend.category}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(currentTrend.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Description */}
                  <h3 className="text-xl font-bold mb-3 line-clamp-2">
                    {currentTrend.description}
                  </h3>

                  {/* Creator info */}
                  {currentTrend.creator_handle && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{currentTrend.creator_handle.startsWith('@') ? currentTrend.creator_handle : `@${currentTrend.creator_handle}`}</span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="text-center">
                      <div className="text-blue-500 text-lg font-bold">
                        {currentTrend.wave_votes || 0}
                      </div>
                      <div className="text-xs text-gray-500">Waves</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 text-lg font-bold">
                        {currentTrend.fire_votes || 0}
                      </div>
                      <div className="text-xs text-gray-500">Fire</div>
                    </div>
                    <div className="text-center">
                      <div className="text-amber-500 text-lg font-bold">
                        {currentTrend.declining_votes || 0}
                      </div>
                      <div className="text-xs text-gray-500">Declining</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-lg font-bold">
                        {currentTrend.dead_votes || 0}
                      </div>
                      <div className="text-xs text-gray-500">Dead</div>
                    </div>
                  </div>

                  {/* Spotter */}
                  <div className="text-xs text-gray-500 text-center">
                    Spotted by {currentTrend.profiles?.username || 'Anonymous'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => handleButtonVote('death')}
          className="p-4 rounded-full bg-gray-100 hover:bg-gray-200 transition-all hover:scale-110"
          title="Dead"
        >
          <Skull className="w-6 h-6 text-gray-600" />
        </button>
        
        <button
          onClick={() => handleButtonVote('decline')}
          className="p-4 rounded-full bg-amber-100 hover:bg-amber-200 transition-all hover:scale-110"
          title="Declining"
        >
          <TrendingDown className="w-6 h-6 text-amber-600" />
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`p-4 rounded-full transition-all hover:scale-110 ${
            isSaving 
              ? 'bg-gray-100 cursor-not-allowed' 
              : savedTrends.has(currentTrend?.id || '')
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-purple-100 hover:bg-purple-200'
          }`}
          title={savedTrends.has(currentTrend?.id || '') ? "Remove from Timeline" : "Save to Timeline"}
        >
          <Bookmark className={`w-6 h-6 ${
            isSaving ? 'text-gray-400' : 
            savedTrends.has(currentTrend?.id || '') ? 'text-white' : 'text-purple-600'
          }`} />
        </button>

        <button
          onClick={() => handleButtonVote('fire')}
          className="p-4 rounded-full bg-red-100 hover:bg-red-200 transition-all hover:scale-110"
          title="Fire"
        >
          <Flame className="w-6 h-6 text-red-600" />
        </button>

        <button
          onClick={() => handleButtonVote('wave')}
          className="p-4 rounded-full bg-blue-100 hover:bg-blue-200 transition-all hover:scale-110"
          title="Wave"
        >
          <TrendingUp className="w-6 h-6 text-blue-600" />
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center mt-4 text-xs text-gray-500">
        Swipe or tap buttons to vote • Pull further for stronger reaction
      </div>
    </div>
  );
}