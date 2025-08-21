'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp as TrendingUpIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  Award as AwardIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Share2 as ShareIcon,
  ExternalLink as ExternalLinkIcon,
  ArrowLeft as ArrowLeftIcon,
  Zap as ZapIcon,
  Clock as ClockIcon,
  Sparkles as SparklesIcon,
  Grid as GridIcon,
  List as ListIcon,
  MapPin as MapPinIcon,
  Briefcase as BriefcaseIcon
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  created_at: string;
}

interface UserStats {
  total_trends: number;
  total_xp: number;
  approved_trends: number;
  viral_trends: number;
  approval_rate: number;
}

interface Trend {
  id: string;
  spotter_id: string;
  category: string;
  description: string;
  screenshot_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'viral';
  quality_score: number;
  validation_count: number;
  xp_amount: number;
  xp_awarded: boolean;
  created_at: string;
  stage?: string;
  approve_count?: number;
  reject_count?: number;
  validation_status?: string;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  post_url?: string;
  thumbnail_url?: string;
  wave_score?: number;
  trend_velocity?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params?.userId as string;
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userTrends, setUserTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Try to get basic user info from auth
        const { data: authData } = await supabase
          .from('auth.users')
          .select('id, email, created_at')
          .eq('id', userId)
          .single();
        
        if (authData) {
          setUserProfile({
            id: authData.id,
            email: authData.email,
            created_at: authData.created_at
          });
        }
      } else {
        setUserProfile(profileData);
      }

      // Fetch user trends
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false });

      if (!trendsError && trendsData) {
        setUserTrends(trendsData);
        
        // Calculate stats
        const totalXP = trendsData.reduce((sum, trend) => sum + (trend.xp_amount || 0), 0);
        const approvedTrends = trendsData.filter(t => t.status === 'approved' || t.status === 'viral').length;
        const viralTrends = trendsData.filter(t => t.status === 'viral').length;
        
        setUserStats({
          total_trends: trendsData.length,
          total_xp: totalXP,
          approved_trends: approvedTrends,
          viral_trends: viralTrends,
          approval_rate: trendsData.length > 0 ? (approvedTrends / trendsData.length) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatEngagement = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'visual_style': '🎨',
      'audio_music': '🎵',
      'creator_technique': '🎬',
      'meme_format': '😂',
      'product_brand': '🛍️',
      'behavior_pattern': '📊'
    };
    return emojiMap[category] || '📌';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'from-green-500 to-emerald-600';
      case 'viral': return 'from-purple-500 to-pink-600';
      case 'rejected': return 'from-red-500 to-rose-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <TrendingUpIcon className="w-12 h-12 text-blue-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>

            {/* User Profile Header */}
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt={userProfile.username || 'User'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-800"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-4 border-gray-800">
                    <UserIcon className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {userProfile?.full_name || userProfile?.username || 'Anonymous User'}
                </h1>
                {userProfile?.username && (
                  <p className="text-gray-400 mb-2">@{userProfile.username}</p>
                )}
                {userProfile?.bio && (
                  <p className="text-gray-300 mb-3">{userProfile.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {userProfile?.location && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{userProfile.location}</span>
                    </div>
                  )}
                  {userProfile?.occupation && (
                    <div className="flex items-center gap-1">
                      <BriefcaseIcon className="w-4 h-4" />
                      <span>{userProfile.occupation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Joined {new Date(userProfile?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {currentUser?.id === userId && (
                <button
                  onClick={() => router.push('/profile')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300 border border-white/10"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Stats Overview */}
            {userStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Total Trends</span>
                    <TrendingUpIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{userStats.total_trends}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Total XP</span>
                    <ZapIcon className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{userStats.total_xp.toLocaleString()}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Approved</span>
                    <SparklesIcon className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{userStats.approved_trends}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Viral</span>
                    <AwardIcon className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{userStats.viral_trends}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Approval Rate</span>
                    <AwardIcon className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{userStats.approval_rate.toFixed(0)}%</p>
                </motion.div>
              </div>
            )}

            {/* View Mode Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Trend Timeline</h2>
              <div className="flex bg-white/5 backdrop-blur-md rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white/20 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <GridIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white/20 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userTrends.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUpIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No trends yet</h3>
            <p className="text-gray-400">This user hasn't spotted any trends yet.</p>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {userTrends.map((trend, index) => (
                    <motion.div
                      key={trend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative"
                    >
                      <div className="relative bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all duration-300">
                        {/* Thumbnail */}
                        <div className="relative h-48 bg-gray-800 overflow-hidden">
                          {(trend.thumbnail_url || trend.screenshot_url) ? (
                            <>
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url || ''}
                                alt="Trend"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60" />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
                              <TrendingUpIcon className="w-16 h-16 text-gray-600" />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className="absolute top-3 right-3">
                            <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold shadow-lg`}>
                              <span className="capitalize">{trend.status}</span>
                            </div>
                          </div>

                          {/* Category Badge */}
                          <div className="absolute bottom-3 left-3">
                            <div className="flex items-center gap-1 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-xs">
                              <span className="text-base">{getCategoryEmoji(trend.category)}</span>
                              <span>{trend.category.replace(/_/g, ' ')}</span>
                            </div>
                          </div>

                          {/* External Link */}
                          {trend.post_url && (
                            <a 
                              href={trend.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-3 left-3 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLinkIcon className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        <div className="p-6">
                          {/* Title */}
                          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                            {trend.description.split('\n')[0]}
                          </h3>

                          {/* Date */}
                          <p className="text-sm text-gray-400 mb-3">
                            {formatDate(trend.created_at)}
                          </p>

                          {/* Engagement Stats */}
                          {((trend.likes_count && trend.likes_count > 0) || (trend.views_count && trend.views_count > 0)) && (
                            <div className="flex items-center gap-4 mb-4">
                              {trend.likes_count && trend.likes_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <HeartIcon className="w-4 h-4 text-red-400" />
                                  <p className="text-xs text-gray-400">{formatEngagement(trend.likes_count)}</p>
                                </div>
                              )}
                              {trend.views_count && trend.views_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <EyeIcon className="w-4 h-4 text-purple-400" />
                                  <p className="text-xs text-gray-400">{formatEngagement(trend.views_count)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* XP Badge */}
                          {trend.xp_amount > 0 && (
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              trend.xp_awarded 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              <ZapIcon className="w-3 h-3" />
                              <span>{trend.xp_amount} XP</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {userTrends.map((trend, index) => (
                    <motion.div
                      key={trend.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        {(trend.thumbnail_url || trend.screenshot_url) && (
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={trend.thumbnail_url || trend.screenshot_url} 
                              alt="Trend"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {trend.description.split('\n')[0]}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <span>{getCategoryEmoji(trend.category)}</span>
                                  {trend.category.replace(/_/g, ' ')}
                                </span>
                                <span>{formatDate(trend.created_at)}</span>
                              </div>
                            </div>

                            <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                              <span className="capitalize">{trend.status}</span>
                            </div>
                          </div>

                          {/* Engagement Stats */}
                          {((trend.likes_count && trend.likes_count > 0) || (trend.views_count && trend.views_count > 0)) && (
                            <div className="flex items-center gap-6 mb-3">
                              {trend.likes_count && trend.likes_count > 0 && (
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                  <HeartIcon className="w-4 h-4 text-red-400" />
                                  <span>{formatEngagement(trend.likes_count)}</span>
                                </div>
                              )}
                              {trend.views_count && trend.views_count > 0 && (
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                  <EyeIcon className="w-4 h-4 text-purple-400" />
                                  <span>{formatEngagement(trend.views_count)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* XP Badge */}
                          {trend.xp_amount > 0 && (
                            <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                              trend.xp_awarded 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              <ZapIcon className="w-4 h-4" />
                              <span>{trend.xp_amount} XP</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}