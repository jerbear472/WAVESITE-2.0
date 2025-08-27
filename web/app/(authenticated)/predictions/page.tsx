'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import VoteButtons from '@/components/VoteButtons';
import { 
  Heart,
  MessageCircle,
  TrendingUp,
  Flame,
  Target,
  Clock,
  Filter,
  ChevronDown,
  BarChart3,
  Users,
  Star,
  Zap,
  Trophy,
  AlertCircle,
  Send,
  UserPlus,
  Activity,
  Eye,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Brain,
  Award,
  Shield,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Vote Button Components
const VoteSideButton = ({ type, trendId, count, icon, label, value, gradient }: any) => {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [voting, setVoting] = useState(false);
  const [localCount, setLocalCount] = useState(count);
  const [hasVoted, setHasVoted] = useState(false);
  
  const handleVote = async () => {
    if (!user || voting) return;
    
    console.log('🗳️ Side Vote:', { type, trendId, value, user: user.id });
    setVoting(true);
    try {
      const response = await fetch('/api/vote-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trend_id: trendId,
          vote_type: type,
          vote_value: value,
          user_id: user.id
        })
      });
      
      const data = await response.json();
      console.log('🗳️ Side Vote Response:', { status: response.status, data });
      
      if (data.success) {
        setLocalCount(data[`${type}_votes`]);
        setHasVoted(true);
        console.log('✅ Side Vote Success');
        if (data.xp_earned && showXPNotification) {
          showXPNotification(data.xp_earned, `Voted: ${type}`);
        }
      } else {
        console.error('❌ Side Vote Failed:', data);
        alert(`Vote failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Side Vote Error:', error);
      alert(`Vote error: ${error}`);
    } finally {
      setVoting(false);
    }
  };
  
  return (
    <motion.button
      onClick={handleVote}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      disabled={voting}
      className={`group relative w-14 h-14 rounded-full bg-white shadow-lg border-2 transition-all ${
        hasVoted ? `bg-gradient-to-r ${gradient} border-transparent` : 'border-gray-200 hover:border-gray-300'
      } ${voting ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col items-center justify-center">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-bold ${hasVoted ? 'text-white' : 'text-gray-700'}`}>
          {localCount}
        </span>
      </div>
      {/* Tooltip */}
      <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label} ({value > 0 ? '+' : ''}{value})
      </div>
    </motion.button>
  );
};

const VoteMobileButton = ({ type, trendId, count, icon, value, gradient }: any) => {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [voting, setVoting] = useState(false);
  const [localCount, setLocalCount] = useState(count);
  const [hasVoted, setHasVoted] = useState(false);
  
  const handleVote = async () => {
    if (!user || voting) return;
    
    console.log('📱 Mobile Vote:', { type, trendId, value, user: user.id });
    setVoting(true);
    try {
      const response = await fetch('/api/vote-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trend_id: trendId,
          vote_type: type,
          vote_value: value,
          user_id: user.id
        })
      });
      
      const data = await response.json();
      console.log('📱 Mobile Vote Response:', { status: response.status, data });
      
      if (data.success) {
        setLocalCount(data[`${type}_votes`]);
        setHasVoted(true);
        console.log('✅ Mobile Vote Success');
        if (data.xp_earned && showXPNotification) {
          showXPNotification(data.xp_earned, `Voted: ${type}`);
        }
      } else {
        console.error('❌ Mobile Vote Failed:', data);
        alert(`Vote failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Mobile Vote Error:', error);
      alert(`Vote error: ${error}`);
    } finally {
      setVoting(false);
    }
  };
  
  return (
    <motion.button
      onClick={handleVote}
      whileTap={{ scale: 0.95 }}
      disabled={voting}
      className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition-all ${
        hasVoted ? `bg-gradient-to-r ${gradient} text-white` : 'bg-white text-gray-700 border border-gray-200'
      } ${voting ? 'opacity-50' : ''}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-bold text-sm">{localCount}</span>
      <span className={`text-xs ${hasVoted ? 'text-white/80' : 'text-gray-500'}`}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </motion.button>
  );
};

interface TrendWithEngagement {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  url: string;
  thumbnail_url?: string;
  creator_handle?: string;
  submitted_at: string;
  spotter_id: string;
  spotter_username: string;
  
  // Engagement metrics
  likes_count: number;
  comments_count: number;
  predictions_count: number;
  heat_score: number;
  user_has_liked: boolean;
  user_has_predicted: boolean;
  
  // Voting data
  wave_votes?: number;
  fire_votes?: number;
  declining_votes?: number;
  dead_votes?: number;
  
  // Prediction breakdown
  prediction_breakdown: {
    '24hrs': number;
    '3days': number;
    '1week': number;
    '2weeks': number;
    'peaked': number;
  };
  
  // Comments
  comments?: Comment[];
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  comment: string;
  created_at: string;
  likes: number;
}

interface UserStats {
  total_predictions: number;
  correct_predictions: number;
  accuracy_rate: number;
  current_streak: number;
  best_category: string;
  xp_earned_today: number;
  rank: number;
  rank_change: number;
}

interface FollowerActivity {
  id: string;
  type: 'prediction' | 'like' | 'comment' | 'follow';
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  trend?: {
    id: string;
    title: string;
  };
  action: string;
  timestamp: string;
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
}

type FilterType = 'all' | 'rising' | 'peaking' | 'need_predictions' | 'following';
type TimeFilter = 'all' | '24hrs' | 'week';
type CategoryFilter = 'all' | 'Fashion' | 'Technology' | 'Lifestyle' | 'Food' | 'Shopping' | 'Pets' | 'Career';

export default function EnhancedPredictionsPage() {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  
  const [trends, setTrends] = useState<TrendWithEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<TrendWithEngagement | null>(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeCommentTrend, setActiveCommentTrend] = useState<TrendWithEngagement | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // User Stats
  const [userStats, setUserStats] = useState<UserStats>({
    total_predictions: 0,
    correct_predictions: 0,
    accuracy_rate: 0,
    current_streak: 0,
    best_category: 'Technology',
    xp_earned_today: 0,
    rank: 0,
    rank_change: 0
  });
  
  // Follower Activity
  const [followerActivity, setFollowerActivity] = useState<FollowerActivity[]>([]);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Prediction form
  const [peakPrediction, setPeakPrediction] = useState('');
  const [confidence, setConfidence] = useState<'very' | 'somewhat' | 'guess'>('somewhat');

  useEffect(() => {
    if (user) {
      loadTrends();
      loadUserStats();
      loadFollowerActivity();
    }
  }, [user, filterType, timeFilter, categoryFilter]);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      // Get user's predictions count (handle table not existing)
      const { count: totalPredictions, error: predError } = await supabase
        .from('trend_predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (predError) {
        console.log('trend_predictions table might not exist yet');
      }
      
      // Get correct predictions (this would need a validation system)
      // For now, let's calculate based on predictions made
      const correctPredictions = Math.floor((totalPredictions || 0) * 0.68); // Assuming 68% accuracy
      
      // Get today's XP from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('xp_total, daily_xp, streak_days')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log('Error fetching profile:', profileError);
      }
      
      // Get user's rank based on XP
      const { count: usersAbove } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('xp_total', profile?.xp_total || 0);
      
      // Get most predicted category (simplified query)
      const { data: submissionsData } = await supabase
        .from('trend_submissions')
        .select('category')
        .eq('spotter_id', user.id)
        .limit(50);
      
      // Count categories
      const categoryCounts: Record<string, number> = {};
      submissionsData?.forEach((item: any) => {
        const category = item.category || 'Other';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      const bestCategory = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Technology';
      
      // Get total submissions count as alternative metric
      const { count: totalSubmissions } = await supabase
        .from('trend_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('spotter_id', user.id);
      
      setUserStats({
        total_predictions: totalSubmissions || totalPredictions || 0,
        correct_predictions: correctPredictions,
        accuracy_rate: (totalSubmissions || totalPredictions) ? Math.round((correctPredictions / (totalSubmissions || totalPredictions || 1)) * 100) : 0,
        current_streak: profile?.streak_days || Math.floor(Math.random() * 7) + 1,
        best_category: bestCategory || 'Technology',
        xp_earned_today: profile?.daily_xp || Math.floor(Math.random() * 200) + 50,
        rank: (usersAbove || 0) + 1 || Math.floor(Math.random() * 100) + 1,
        rank_change: Math.floor(Math.random() * 10) - 5
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
      // Set default values on error
      setUserStats({
        total_predictions: 0,
        correct_predictions: 0,
        accuracy_rate: 0,
        current_streak: 0,
        best_category: 'Technology',
        xp_earned_today: 0,
        rank: 0,
        rank_change: 0
      });
    }
  };

  const loadFollowerActivity = async () => {
    if (!user) return;
    
    try {
      // Get recent predictions from followed users
      const { data: recentPredictions } = await supabase
        .from('trend_predictions')
        .select(`
          id,
          peak_time,
          created_at,
          user:profiles!user_id(id, username, avatar_url),
          trend:trend_submissions!trend_id(id, title)
        `)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Get recent likes on user's predictions
      const { data: recentLikes } = await supabase
        .from('trend_likes')
        .select(`
          id,
          created_at,
          user:profiles!user_id(id, username, avatar_url),
          trend:trend_submissions!trend_id(id, title)
        `)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Combine and format activities
      const activities: FollowerActivity[] = [];
      
      // Add predictions
      recentPredictions?.forEach((pred: any) => {
        if (pred.user && pred.trend) {
          activities.push({
            id: `pred-${pred.id}`,
            type: 'prediction',
            user: pred.user,
            trend: pred.trend,
            action: `predicted will peak in ${pred.peak_time}`,
            timestamp: formatTimeAgo(pred.created_at)
          });
        }
      });
      
      // Add likes
      recentLikes?.forEach((like: any) => {
        if (like.user && like.trend) {
          activities.push({
            id: `like-${like.id}`,
            type: 'like',
            user: like.user,
            trend: like.trend,
            action: 'liked your prediction',
            timestamp: formatTimeAgo(like.created_at)
          });
        }
      });
      
      // Sort by timestamp and take top 10
      activities.sort((a, b) => {
        // Would need proper date comparison here
        return 0;
      });
      
      setFollowerActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading follower activity:', error);
      // Set mock data as fallback
    const mockActivity: FollowerActivity[] = [
      {
        id: '1',
        type: 'prediction',
        user: { id: 'u1', username: 'TrendMaster', avatar_url: '/api/placeholder/32/32' },
        trend: { id: '550e8400-e29b-41d4-a716-446655440001', title: 'AI Voice Cloning Pranks' },
        action: 'predicted will peak in 24hrs',
        timestamp: '2 minutes ago'
      },
      {
        id: '2',
        type: 'follow',
        user: { id: 'u2', username: 'ViralScout', avatar_url: '/api/placeholder/32/32' },
        action: 'started following you',
        timestamp: '15 minutes ago'
      },
      {
        id: '3',
        type: 'like',
        user: { id: 'u3', username: 'CultureWave', avatar_url: '/api/placeholder/32/32' },
        trend: { id: '550e8400-e29b-41d4-a716-446655440002', title: 'Silent Walking Movement' },
        action: 'liked your prediction',
        timestamp: '1 hour ago'
      },
      {
        id: '4',
        type: 'comment',
        user: { id: 'u4', username: 'PredictionPro', avatar_url: '/api/placeholder/32/32' },
        trend: { id: '550e8400-e29b-41d4-a716-446655440003', title: 'Dupe Culture' },
        action: 'commented on',
        timestamp: '2 hours ago'
      }
    ];
    setFollowerActivity(mockActivity);
    }
  };

  const loadTrends = async () => {
    try {
      setLoading(true);
      
      // Using dummy data for development
      const allDummyTrends: TrendWithEngagement[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          title: '90s Fashion Revival Takes Over Gen Z',
          description: 'Vintage thrift finds and Y2K aesthetics are dominating social media feeds.',
          platform: 'tiktok',
          category: 'Fashion',
          url: 'https://example.com/trend-1',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@retrofashionista',
          submitted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-123',
          spotter_username: 'TrendHunter',
          likes_count: 245,
          comments_count: 67,
          predictions_count: 89,
          heat_score: 15,
          user_has_liked: false,
          user_has_predicted: false,
          wave_votes: 12,
          fire_votes: 8,
          declining_votes: 2,
          dead_votes: 1,
          prediction_breakdown: {
            '24hrs': 35,
            '3days': 28,
            '1week': 18,
            '2weeks': 6,
            'peaked': 2
          },
          comments: [
            {
              id: 'c1',
              user_id: 'u1',
              username: 'FashionGuru',
              comment: 'This is definitely going mainstream. I saw 3 major brands already jumping on this.',
              created_at: '1 hour ago',
              likes: 12
            },
            {
              id: 'c2',
              user_id: 'u2',
              username: 'GenZTrendy',
              comment: 'Already peaked in my city. Everyone at uni is wearing baggy jeans now.',
              created_at: '3 hours ago',
              likes: 8
            }
          ]
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          title: 'AI Voice Cloning Pranks Go Viral',
          description: 'Content creators are using AI to clone celebrity voices for harmless pranks.',
          platform: 'youtube',
          category: 'Technology',
          url: 'https://example.com/trend-2',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@techprankster',
          submitted_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-456',
          spotter_username: 'DigitalScout',
          likes_count: 512,
          comments_count: 234,
          predictions_count: 156,
          heat_score: 8,
          user_has_liked: true,
          user_has_predicted: false,
          wave_votes: 5,
          fire_votes: 15,
          declining_votes: 4,
          dead_votes: 2,
          prediction_breakdown: {
            '24hrs': 45,
            '3days': 67,
            '1week': 32,
            '2weeks': 10,
            'peaked': 2
          },
          comments: []
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          title: 'Silent Walking Movement',
          description: 'People are ditching podcasts and music during walks for mental health.',
          platform: 'instagram',
          category: 'Lifestyle',
          url: 'https://example.com/trend-3',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@mindfulmovement',
          submitted_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-789',
          spotter_username: 'WellnessWatcher',
          likes_count: 189,
          comments_count: 45,
          predictions_count: 23,
          heat_score: 45.2,
          user_has_liked: false,
          user_has_predicted: true,
          prediction_breakdown: {
            '24hrs': 8,
            '3days': 10,
            '1week': 3,
            '2weeks': 2,
            'peaked': 0
          },
          comments: []
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          title: 'Microgreens Home Growing Explodes',
          description: 'Urban dwellers are growing nutrient-dense microgreens on windowsills.',
          platform: 'tiktok',
          category: 'Food',
          url: 'https://example.com/trend-4',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@urbangardener',
          submitted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-321',
          spotter_username: 'FoodTrendSpotter',
          likes_count: 367,
          comments_count: 89,
          predictions_count: 45,
          heat_score: 67.8,
          user_has_liked: true,
          user_has_predicted: false,
          prediction_breakdown: {
            '24hrs': 12,
            '3days': 18,
            '1week': 10,
            '2weeks': 5,
            'peaked': 0
          },
          comments: []
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          title: 'Dupe Culture Goes Mainstream',
          description: 'Finding affordable "dupes" of luxury items becomes a flex.',
          platform: 'tiktok',
          category: 'Shopping',
          url: 'https://example.com/trend-5',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@budgetqueen',
          submitted_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-654',
          spotter_username: 'ShoppingGuru',
          likes_count: 892,
          comments_count: 456,
          predictions_count: 234,
          heat_score: 156.3,
          user_has_liked: false,
          user_has_predicted: false,
          prediction_breakdown: {
            '24hrs': 89,
            '3days': 78,
            '1week': 45,
            '2weeks': 20,
            'peaked': 2
          },
          comments: []
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          title: 'Corporate Core Aesthetic',
          description: 'Young professionals ironically embrace corporate fashion.',
          platform: 'instagram',
          category: 'Fashion',
          url: 'https://example.com/trend-6',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@officeaesthetic',
          submitted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-987',
          spotter_username: 'StyleScout',
          likes_count: 145,
          comments_count: 23,
          predictions_count: 12,
          heat_score: 28.9,
          user_has_liked: false,
          user_has_predicted: false,
          prediction_breakdown: {
            '24hrs': 3,
            '3days': 5,
            '1week': 3,
            '2weeks': 1,
            'peaked': 0
          },
          comments: []
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440007',
          title: 'BeReal For Pets',
          description: 'Authentic, unfiltered daily content of pets.',
          platform: 'instagram',
          category: 'Pets',
          url: 'https://example.com/trend-7',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@petparent',
          submitted_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-222',
          spotter_username: 'PetTrendWatcher',
          likes_count: 678,
          comments_count: 234,
          predictions_count: 89,
          heat_score: 234.5,
          user_has_liked: true,
          user_has_predicted: true,
          prediction_breakdown: {
            '24hrs': 45,
            '3days': 30,
            '1week': 10,
            '2weeks': 4,
            'peaked': 0
          },
          comments: []
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440008',
          title: 'Rage Applying Job Hunt Strategy',
          description: 'Mass-applying to jobs when upset at work.',
          platform: 'twitter',
          category: 'Career',
          url: 'https://example.com/trend-8',
          thumbnail_url: '/api/placeholder/400/300',
          creator_handle: '@careercoach',
          submitted_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          spotter_id: 'user-333',
          spotter_username: 'WorkTrendTracker',
          likes_count: 423,
          comments_count: 178,
          predictions_count: 67,
          heat_score: 89.6,
          user_has_liked: false,
          user_has_predicted: false,
          prediction_breakdown: {
            '24hrs': 25,
            '3days': 28,
            '1week': 10,
            '2weeks': 4,
            'peaked': 0
          },
          comments: []
        }
      ];
      
      // Apply filters
      let filteredTrends = [...allDummyTrends];
      
      if (categoryFilter !== 'all') {
        filteredTrends = filteredTrends.filter(t => t.category === categoryFilter);
      }
      
      if (filterType === 'rising') {
        filteredTrends = filteredTrends.filter(t => t.heat_score > 50);
      } else if (filterType === 'peaking') {
        filteredTrends = filteredTrends.filter(t => t.prediction_breakdown['24hrs'] > t.predictions_count * 0.4);
      } else if (filterType === 'need_predictions') {
        filteredTrends = filteredTrends.filter(t => t.predictions_count < 50);
      } else if (filterType === 'following') {
        // Would filter by trends from followed users
        filteredTrends = filteredTrends.filter(t => t.heat_score > 80);
      }
      
      filteredTrends.sort((a, b) => b.heat_score - a.heat_score);
      setTrends(filteredTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (trendId: string, currentlyLiked: boolean) => {
    setTrends(prev => prev.map(trend => {
      if (trend.id === trendId) {
        return {
          ...trend,
          user_has_liked: !currentlyLiked,
          likes_count: currentlyLiked ? trend.likes_count - 1 : trend.likes_count + 1
        };
      }
      return trend;
    }));

    if (!currentlyLiked) {
      showXPNotification(5, 'Trend liked! +5 XP', 'bonus');
    }
  };

  const handleComment = async () => {
    if (!activeCommentTrend || !commentText.trim()) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      user_id: user?.id || '',
      username: 'You',
      comment: commentText,
      created_at: 'Just now',
      likes: 0
    };

    setTrends(prev => prev.map(trend => {
      if (trend.id === activeCommentTrend.id) {
        return {
          ...trend,
          comments: [...(trend.comments || []), newComment],
          comments_count: trend.comments_count + 1
        };
      }
      return trend;
    }));

    setCommentText('');
    showXPNotification(10, 'Comment added! +10 XP', 'bonus');
  };

  const handlePredict = async () => {
    if (!user || !selectedTrend || !peakPrediction) return;

    const baseXP = 10;
    const confidenceBonus = confidence === 'very' ? 10 : confidence === 'somewhat' ? 5 : 0;
    const totalXP = baseXP + confidenceBonus;

    showXPNotification(totalXP, `Prediction locked in! ${confidence === 'very' ? 'Bold move!' : ''}`, 'prediction');

    setTrends(prev => prev.map(trend => {
      if (trend.id === selectedTrend.id) {
        const updatedBreakdown = { ...trend.prediction_breakdown };
        if (peakPrediction in updatedBreakdown) {
          updatedBreakdown[peakPrediction as keyof typeof updatedBreakdown]++;
        }
        return {
          ...trend,
          user_has_predicted: true,
          predictions_count: trend.predictions_count + 1,
          prediction_breakdown: updatedBreakdown
        };
      }
      return trend;
    }));

    setShowPredictionModal(false);
    setSelectedTrend(null);
    setPeakPrediction('');
    setConfidence('somewhat');
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      tiktok: '🎵',
      instagram: '📸',
      twitter: '𝕏',
      reddit: '🔥',
      youtube: '📺',
      default: '🌐'
    };
    return emojis[platform.toLowerCase()] || emojis.default;
  };

  const formatHeatScore = (score: number) => {
    if (score > 200) return '🌋';
    if (score > 100) return '🔥🔥🔥';
    if (score > 50) return '🔥🔥';
    if (score > 20) return '🔥';
    return '📈';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                The Arena
              </h1>
              <p className="text-sm text-gray-600">Predict the next viral wave</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowActivityPanel(!showActivityPanel)}
                className="relative p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Activity className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500 py-2">Show:</span>
                  {(['all', 'rising', 'peaking', 'need_predictions', 'following'] as FilterType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        filterType === type
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'all' && 'All'}
                      {type === 'rising' && '🔥 Rising'}
                      {type === 'peaking' && '🚀 Peaking'}
                      {type === 'need_predictions' && '❓ Need Predictions'}
                      {type === 'following' && '👥 Following'}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Metric Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span className="text-xs text-green-500 font-medium">
                    +{userStats.rank_change > 0 ? userStats.rank_change : 0}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{userStats.accuracy_rate}%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-xs text-gray-500">🔥</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{userStats.current_streak}</div>
                <div className="text-xs text-gray-500">Day Streak</div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-xs font-medium text-gray-500">#{userStats.rank}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{userStats.xp_earned_today}</div>
                <div className="text-xs text-gray-500">XP Today</div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <span className="text-xs text-gray-500">{userStats.best_category}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{userStats.total_predictions}</div>
                <div className="text-xs text-gray-500">Predictions</div>
              </motion.div>
            </div>

            {/* Trends Feed */}
            <div className="space-y-8">
              {trends.map((trend, index) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Desktop Side Voting Buttons - Left */}
                  <div className="hidden lg:flex absolute -left-20 top-1/2 -translate-y-1/2 flex-col gap-2 z-10">
                    <VoteSideButton 
                      type="wave" 
                      trendId={trend.id}
                      count={trend.wave_votes || 0}
                      icon="🌊"
                      label="Wave"
                      value={2}
                      gradient="from-blue-400 to-cyan-500"
                    />
                    <VoteSideButton 
                      type="fire" 
                      trendId={trend.id}
                      count={trend.fire_votes || 0}
                      icon="🔥"
                      label="Fire"
                      value={1}
                      gradient="from-orange-400 to-red-500"
                    />
                  </div>
                  
                  {/* Desktop Side Voting Buttons - Right */}
                  <div className="hidden lg:flex absolute -right-20 top-1/2 -translate-y-1/2 flex-col gap-2 z-10">
                    <VoteSideButton 
                      type="declining" 
                      trendId={trend.id}
                      count={trend.declining_votes || 0}
                      icon="📉"
                      label="Declining"
                      value={-1}
                      gradient="from-yellow-400 to-amber-500"
                    />
                    <VoteSideButton 
                      type="dead" 
                      trendId={trend.id}
                      count={trend.dead_votes || 0}
                      icon="💀"
                      label="Dead"
                      value={-2}
                      gradient="from-gray-400 to-gray-600"
                    />
                  </div>
                  
                  {/* Mobile Top Voting Buttons */}
                  <div className="lg:hidden flex justify-center gap-3 mb-2">
                    <VoteMobileButton 
                      type="wave" 
                      trendId={trend.id}
                      count={trend.wave_votes || 0}
                      icon="🌊"
                      value={2}
                      gradient="from-blue-400 to-cyan-500"
                    />
                    <VoteMobileButton 
                      type="fire" 
                      trendId={trend.id}
                      count={trend.fire_votes || 0}
                      icon="🔥"
                      value={1}
                      gradient="from-orange-400 to-red-500"
                    />
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-100 overflow-hidden group">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 group-hover:scale-105 transition-transform">
                        {trend.thumbnail_url ? (
                          <img src={trend.thumbnail_url} alt={trend.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl">{getPlatformEmoji(trend.platform)}</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {formatHeatScore(trend.heat_score)} {trend.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">{trend.description}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                @{trend.spotter_username}
                              </span>
                              <span>•</span>
                              <span>{new Date(trend.submitted_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                                {trend.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Prediction Breakdown */}
                        {trend.predictions_count > 0 && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              Community Predictions ({trend.predictions_count} total)
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(trend.prediction_breakdown)
                                .filter(([_, count]) => count > 0)
                                .map(([time, count]) => {
                                  const percentage = Math.round((count / trend.predictions_count) * 100);
                                  return (
                                    <div key={time} className="flex items-center gap-1">
                                      <div className="relative h-4 w-24 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-600">
                                        {time} ({percentage}%)
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mt-4">
                          <button
                            onClick={() => handleLike(trend.id, trend.user_has_liked)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                              trend.user_has_liked
                                ? 'bg-red-50 text-red-600 scale-105'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${trend.user_has_liked ? 'fill-current' : ''}`} />
                            <span className="text-sm font-medium">{trend.likes_count}</span>
                          </button>

                          <button 
                            onClick={() => {
                              setActiveCommentTrend(trend);
                              setShowCommentsModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{trend.comments_count}</span>
                          </button>

                          <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-sm font-medium">{trend.predictions_count}</span>
                          </button>

                          {!trend.user_has_predicted && (
                            <button
                              onClick={() => {
                                setSelectedTrend(trend);
                                setShowPredictionModal(true);
                              }}
                              className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                            >
                              <Target className="w-4 h-4" />
                              <span className="text-sm font-medium">Predict Peak</span>
                            </button>
                          )}
                          
                          {trend.user_has_predicted && (
                            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                              <Shield className="w-4 h-4" />
                              <span className="text-sm font-medium">Prediction Locked</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Original Vote Buttons Hidden on Mobile */}
                    <div className="hidden lg:block mt-4 pt-4 border-t border-gray-100">
                      <VoteButtons
                        trendId={trend.id}
                        initialHeatScore={trend.heat_score}
                        initialVotes={{
                          wave: trend.wave_votes || 0,
                          fire: trend.fire_votes || 0,
                          declining: trend.declining_votes || 0,
                          dead: trend.dead_votes || 0
                        }}
                        onVoteUpdate={(data) => {
                          // Update the trend in state with new vote data
                          setTrends(prevTrends => 
                            prevTrends.map(t => 
                              t.id === trend.id 
                                ? { 
                                    ...t, 
                                    heat_score: data.heat_score,
                                    wave_votes: data.wave_votes,
                                    fire_votes: data.fire_votes,
                                    declining_votes: data.declining_votes,
                                    dead_votes: data.dead_votes
                                  }
                                : t
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                  </div>
                  
                  {/* Mobile Bottom Voting Buttons */}
                  <div className="lg:hidden flex justify-center gap-3 mt-2">
                    <VoteMobileButton 
                      type="declining" 
                      trendId={trend.id}
                      count={trend.declining_votes || 0}
                      icon="📉"
                      value={-1}
                      gradient="from-yellow-400 to-amber-500"
                    />
                    <VoteMobileButton 
                      type="dead" 
                      trendId={trend.id}
                      count={trend.dead_votes || 0}
                      icon="💀"
                      value={-2}
                      gradient="from-gray-400 to-gray-600"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Activity Panel */}
            <AnimatePresence>
              {showActivityPanel && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                >
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Follower Activity
                  </h3>
                  <div className="space-y-3">
                    {followerActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
                        <div className="flex-1">
                          <div className="text-gray-900">
                            <span className="font-medium">{activity.user.username}</span>
                            {' '}{activity.action}
                            {activity.trend && (
                              <span className="font-medium"> {activity.trend.title}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{activity.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Predictors */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Top Predictors
              </h3>
              <div className="space-y-3">
                {[
                  { username: 'TrendMaster', accuracy: 78, rank: 1 },
                  { username: 'ViralScout', accuracy: 72, rank: 2 },
                  { username: 'CultureWave', accuracy: 69, rank: 3 },
                  { username: 'You', accuracy: 66, rank: 23 },
                ].map((predictor) => (
                  <div key={predictor.username} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        #{predictor.rank}
                      </span>
                      <span className="text-sm text-gray-700">{predictor.username}</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      {predictor.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
                View Full Leaderboard →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Modal */}
      <AnimatePresence>
        {showCommentsModal && activeCommentTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCommentsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Comments</h3>
                <button
                  onClick={() => setShowCommentsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-4">
                {activeCommentTrend.comments && activeCommentTrend.comments.length > 0 ? (
                  activeCommentTrend.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{comment.username}</span>
                          <span className="text-xs text-gray-500">{comment.created_at}</span>
                        </div>
                        <p className="text-gray-700 text-sm">{comment.comment}</p>
                        <button className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          <Heart className="w-3 h-3" />
                          <span>{comment.likes}</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No comments yet. Be the first!</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleComment}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prediction Modal */}
      <AnimatePresence>
        {showPredictionModal && selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPredictionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Make Your Prediction</h3>
              <p className="text-gray-600 mb-4">{selectedTrend.title}</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When will this peak?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '24hrs', label: '24 hours', icon: '⚡' },
                    { value: '3days', label: '3 days', icon: '🔥' },
                    { value: '1week', label: '1 week', icon: '📈' },
                    { value: '2weeks', label: '2 weeks', icon: '🚀' },
                    { value: 'peaked', label: 'Already peaked', icon: '📉' },
                    { value: 'here_to_stay', label: 'Here to stay', icon: '🧬' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPeakPrediction(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        peakPrediction === option.value
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How confident are you?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'very' as const, label: 'Very', xp: '+20 XP', color: 'from-green-500 to-emerald-500' },
                    { value: 'somewhat' as const, label: 'Somewhat', xp: '+15 XP', color: 'from-blue-500 to-cyan-500' },
                    { value: 'guess' as const, label: 'Guessing', xp: '+10 XP', color: 'from-gray-500 to-gray-600' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setConfidence(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        confidence === option.value
                          ? `bg-gradient-to-r ${option.color} text-white scale-105`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div>{option.label}</div>
                      <div className="text-xs opacity-75">{option.xp}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPredictionModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePredict}
                  disabled={!peakPrediction}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lock In Prediction
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}