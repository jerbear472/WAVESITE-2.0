'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import TrendSwipeStack from '@/components/TrendSwipeStack';
import { 
  RefreshCw, 
  TrendingUp, 
  Filter,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function PredictionsPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'trending' | 'new'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [votedTrends, setVotedTrends] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchTrends();
      loadVotedTrends();
    }
  }, [user, filter]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      
      // Build query based on filter
      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          profiles:spotter_id (
            username
          )
        `)
        .eq('status', 'approved')
        .not('id', 'in', `(${Array.from(votedTrends).join(',')})`) // Exclude already voted trends
        .limit(50);

      // Apply filters
      if (filter === 'trending') {
        query = query.order('wave_votes', { ascending: false });
      } else if (filter === 'new') {
        query = query.order('created_at', { ascending: false });
      } else {
        // Mix of trending and new
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Debug: Log what we're getting
      if (data && data.length > 0) {
        console.log('Headlines: First trend thumbnail_url:', data[0].thumbnail_url);
        console.log('Headlines: First trend screenshot_url:', data[0].screenshot_url);
      }

      // Shuffle trends for variety (except when filtering by trending)
      const processedTrends = filter === 'trending' 
        ? data 
        : data?.sort(() => Math.random() - 0.5);

      setTrends(processedTrends || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
      showError('Failed to load trends');
    } finally {
      setLoading(false);
    }
  };

  const loadVotedTrends = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('trend_user_votes')
        .select('trend_id')
        .eq('user_id', user.id);
      
      if (data) {
        setVotedTrends(new Set(data.map(v => v.trend_id)));
      }
    } catch (error) {
      console.error('Error loading voted trends:', error);
    }
  };

  const handleVote = async (trendId: string, voteType: 'wave' | 'fire' | 'decline' | 'death') => {
    if (!user) return;
    
    try {
      // Record user vote
      await supabase
        .from('trend_user_votes')
        .upsert({
          user_id: user.id,
          trend_id: trendId,
          vote_type: voteType,
          voted_at: new Date().toISOString()
        });
      
      // Add to voted set
      setVotedTrends(prev => new Set([...prev, trendId]));
      
      // Award XP for voting
      const xpAmount = voteType === 'wave' ? 5 : 3;
      await supabase
        .from('xp_events')
        .insert({
          user_id: user.id,
          xp_change: xpAmount,
          event_type: 'trend_vote',
          description: `Voted ${voteType} on trend`,
          metadata: { trend_id: trendId, vote_type: voteType }
        });
      
    } catch (error) {
      console.error('Error recording vote:', error);
    }
  };

  const handleSave = async (trend: Trend, reaction: 'wave' | 'fire' | 'decline' | 'death' | null) => {
    if (!user) return;
    
    try {
      // Save trend to user's timeline with reaction
      await supabase
        .from('saved_trends')
        .insert({
          user_id: user.id,
          trend_id: trend.id,
          reaction,
          saved_at: new Date().toISOString()
        });
      
      showSuccess('Saved to your timeline!');
    } catch (error: any) {
      if (error.code === '23505') {
        showError('Already in your timeline');
      } else {
        console.error('Error saving trend:', error);
        showError('Failed to save trend');
      }
    }
  };

  const handleRefresh = () => {
    fetchTrends();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <Sparkles className="w-8 h-8 text-purple-500" />
          </motion.div>
          <p className="text-gray-600">Loading trends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Headlines
              </h1>
              <p className="text-sm text-gray-600">Swipe to predict trend futures</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Filter dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium capitalize">{filter}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                    >
                      <button
                        onClick={() => {
                          setFilter('all');
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                          filter === 'all' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        All Trends
                      </button>
                      <button
                        onClick={() => {
                          setFilter('trending');
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                          filter === 'trending' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        Trending Now
                      </button>
                      <button
                        onClick={() => {
                          setFilter('new');
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                          filter === 'new' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        Newest First
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{trends.length}</div>
            <div className="text-xs text-gray-600">Available</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{votedTrends.size}</div>
            <div className="text-xs text-gray-600">Voted</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {trends.filter(t => (t.wave_votes || 0) > 10).length}
            </div>
            <div className="text-xs text-gray-600">Trending</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {trends.filter(t => {
                const hoursSinceCreated = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                return hoursSinceCreated < 24;
              }).length}
            </div>
            <div className="text-xs text-gray-600">New (24h)</div>
          </div>
        </div>

        {/* Swipe Stack */}
        <TrendSwipeStack
          trends={trends.filter(t => !votedTrends.has(t.id))}
          onVote={handleVote}
          onSave={handleSave}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}