'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Flame, TrendingUp, MapPin, Users, Zap, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import DailyMoment from '@/components/DailyMoment';
import Image from 'next/image';

interface MomentSubmission {
  id: string;
  user_id: string;
  trend_spotted: string;
  screenshot_url?: string;
  platform?: string;
  location?: string;
  submission_time_seconds: number;
  on_time: boolean;
  reacts: {
    fire: number;
    real: number;
    cap: number;
    late: number;
  };
  user: {
    username: string;
    avatar_url?: string;
  };
}

interface DailyPrompt {
  id: string;
  prompt_text: string;
  prompt_time: string;
  window_closes_at: string;
}

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  total_moments: number;
  on_time_submissions: number;
}

export default function DailyMomentsPage() {
  const { user } = useAuth();
  const [activePrompt, setActivePrompt] = useState<DailyPrompt | null>(null);
  const [showMomentModal, setShowMomentModal] = useState(false);
  const [submissions, setSubmissions] = useState<MomentSubmission[]>([]);
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSubmitted, setUserSubmitted] = useState(false);

  // Check for active prompt
  useEffect(() => {
    checkActivePrompt();
    loadUserStreak();
    
    // Check every 30 seconds for new prompts
    const interval = setInterval(checkActivePrompt, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const checkActivePrompt = async () => {
    try {
      const now = new Date().toISOString();
      
      // Get today's prompt
      const { data: prompt } = await supabase
        .from('daily_moment_prompts')
        .select('*')
        .gte('window_closes_at', now)
        .lte('prompt_time', now)
        .single();

      if (prompt) {
        setActivePrompt(prompt);
        
        // Check if user already submitted
        if (user) {
          const { data: submission } = await supabase
            .from('daily_moment_submissions')
            .select('id')
            .eq('prompt_id', prompt.id)
            .eq('user_id', user.id)
            .single();
            
          setUserSubmitted(!!submission);
        }
      } else {
        // Load recent submissions if no active prompt
        loadRecentSubmissions();
      }
    } catch (error) {
      console.error('Error checking prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSubmissions = async () => {
    try {
      // Get most recent closed prompt
      const { data: recentPrompt } = await supabase
        .from('daily_moment_prompts')
        .select('*')
        .lt('window_closes_at', new Date().toISOString())
        .order('prompt_time', { ascending: false })
        .limit(1)
        .single();

      if (recentPrompt) {
        // Load all submissions for this prompt
        const { data: subs } = await supabase
          .from('daily_moment_submissions')
          .select(`
            *,
            user:user_profiles(username, avatar_url)
          `)
          .eq('prompt_id', recentPrompt.id)
          .order('submission_time_seconds', { ascending: true });

        setSubmissions(subs || []);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const loadUserStreak = async () => {
    if (!user) return;
    
    try {
      const { data: streak } = await supabase
        .from('daily_moment_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      setUserStreak(streak);
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  const handleReaction = async (submissionId: string, reactionType: 'fire' | 'real' | 'cap' | 'late') => {
    if (!user) return;
    
    try {
      // Toggle reaction
      const { data: existing } = await supabase
        .from('daily_moment_reactions')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Remove reaction
        await supabase
          .from('daily_moment_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add reaction
        await supabase
          .from('daily_moment_reactions')
          .insert({
            submission_id: submissionId,
            user_id: user.id,
            reaction_type: reactionType
          });
      }

      // Reload submissions to get updated counts
      loadRecentSubmissions();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const getReactionEmoji = (type: string) => {
    switch (type) {
      case 'fire': return '🔥';
      case 'real': return '💯';
      case 'cap': return '🧢';
      case 'late': return '⏰';
      default: return '👍';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Daily Moments</h1>
              <p className="text-sm text-gray-600">Real-time culture capture</p>
            </div>
            
            {/* Streak display */}
            {userStreak && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">🔥 {userStreak.current_streak}</div>
                  <div className="text-xs text-gray-500">Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStreak.total_moments}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active prompt notification */}
      {activePrompt && !userSubmitted && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div>
                <p className="font-bold">Daily Moment is LIVE!</p>
                <p className="text-sm opacity-90">2 minutes to submit what you're seeing</p>
              </div>
            </div>
            <button
              onClick={() => setShowMomentModal(true)}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              Submit Now
            </button>
          </div>
        </div>
      )}

      {/* Submissions grid */}
      <div className="max-w-4xl mx-auto p-4">
        {submissions.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">No moments yet today</h2>
            <p className="text-gray-500">
              The next Daily Moment will appear at a random time. Turn on notifications!
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4">Today's Moments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  {/* User header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                          {submission.user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{submission.user.username}</p>
                          <p className="text-xs text-gray-500">
                            {submission.on_time ? (
                              <span className="text-green-600">
                                ⚡ {submission.submission_time_seconds}s
                              </span>
                            ) : (
                              <span className="text-gray-400">Late submission</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {submission.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {submission.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <p className="text-gray-800 mb-3">{submission.trend_spotted}</p>
                    
                    {submission.screenshot_url && (
                      <img 
                        src={submission.screenshot_url}
                        alt="Moment"
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    
                    {submission.platform && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {submission.platform}
                      </span>
                    )}
                  </div>

                  {/* Reactions */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2">
                      {Object.entries(submission.reacts).map(([type, count]) => (
                        <button
                          key={type}
                          onClick={() => handleReaction(submission.id, type as any)}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <span>{getReactionEmoji(type)}</span>
                          <span className="text-sm text-gray-600">{count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Daily Moment Modal */}
      {showMomentModal && activePrompt && (
        <DailyMoment
          promptId={activePrompt.id}
          promptText={activePrompt.prompt_text}
          windowClosesAt={activePrompt.window_closes_at}
          onComplete={() => {
            setShowMomentModal(false);
            setUserSubmitted(true);
            checkActivePrompt();
          }}
        />
      )}
    </div>
  );
}