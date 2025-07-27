'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Timeline from '@/components/Timeline';
import { motion } from 'framer-motion';
import { 
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  Grid3X3,
  List,
  Layers
} from 'lucide-react';

export default function TimelineV2Page() {
  const { user, loading: authLoading } = useAuth();
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState<'default' | 'compact' | 'detailed'>('default');
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchUserTrends();
    }
  }, [user, authLoading, router]);

  const fetchUserTrends = async (showRefreshAnimation = false) => {
    try {
      if (showRefreshAnimation) setRefreshing(true);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data for Timeline component
      const timelineItems = (data || []).map(trend => ({
        id: trend.id,
        date: trend.created_at,
        title: trend.evidence?.title || trend.description.split('\n')[0] || 'Untitled Trend',
        description: trend.post_caption,
        category: trend.category,
        status: trend.status,
        thumbnail: trend.thumbnail_url || trend.screenshot_url,
        url: trend.post_url,
        creator: {
          handle: trend.creator_handle,
          name: trend.creator_name,
          platform: trend.evidence?.platform
        },
        engagement: {
          likes: trend.likes_count,
          comments: trend.comments_count,
          shares: trend.shares_count,
          views: trend.views_count
        },
        hashtags: trend.hashtags,
        earnings: trend.bounty_amount || 0.10,
        viralityScore: trend.virality_prediction,
        validations: trend.validation_count
      }));
      
      setTrends(timelineItems);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
      if (showRefreshAnimation) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  const getFilteredTrends = () => {
    if (filter === 'all') return trends;
    return trends.filter(trend => trend.status === filter);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <TrendingUp className="w-12 h-12 text-blue-400" />
        </motion.div>
      </div>
    );
  }

  const filteredTrends = getFilteredTrends();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
                  Trend Timeline
                </h1>
                <p className="text-gray-400 mt-1">Your journey through viral trends</p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fetchUserTrends(true)}
                disabled={refreshing}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 border border-white/10"
              >
                <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* View Variant Selector */}
                <div className="flex bg-white/5 backdrop-blur-md rounded-lg p-1 border border-white/10">
                  <button
                    onClick={() => setVariant('compact')}
                    className={`p-2 rounded-md transition-all flex items-center gap-2 px-3 ${
                      variant === 'compact' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span className="text-sm">Compact</span>
                  </button>
                  <button
                    onClick={() => setVariant('default')}
                    className={`p-2 rounded-md transition-all flex items-center gap-2 px-3 ${
                      variant === 'default' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span className="text-sm">Default</span>
                  </button>
                  <button
                    onClick={() => setVariant('detailed')}
                    className={`p-2 rounded-md transition-all flex items-center gap-2 px-3 ${
                      variant === 'detailed' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span className="text-sm">Detailed</span>
                  </button>
                </div>

                {/* Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="validating">Validating</option>
                  <option value="approved">Approved</option>
                  <option value="viral">Viral</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="text-sm text-gray-400">
                {filteredTrends.length} {filteredTrends.length === 1 ? 'trend' : 'trends'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTrends.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full mb-6">
              <Calendar className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No trends in your timeline yet
            </h3>
            <p className="text-gray-400 mb-6">
              Start spotting trends to build your timeline!
            </p>
            <button
              onClick={() => router.push('/submit')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Submit Your First Trend
            </button>
          </motion.div>
        ) : (
          <Timeline 
            items={filteredTrends}
            variant={variant}
            showConnector={variant !== 'compact'}
            animated={true}
          />
        )}
      </div>
    </div>
  );
}