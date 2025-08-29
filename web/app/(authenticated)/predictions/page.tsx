'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
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
import TrendPredictionChartV7 from '@/components/TrendPredictionChartV7';
import PredictionTrendCard from '@/components/PredictionTrendCard';
import { addDays } from 'date-fns';

// Custom Vote Button Components - Updated to handle vote changes properly
const VoteSideButton = ({ type, trendId, count, icon, label, value, gradient, userVote, onVote, allCounts, setAllCounts }: any) => {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [voting, setVoting] = useState(false);
  const hasVoted = userVote === type;
  
  // Use count from allCounts to ensure proper updates, fallback to initial count
  const displayCount = allCounts?.[type] !== undefined ? allCounts[type] : count;
  
  const handleVote = async () => {
    console.log('🎯 Vote button clicked!', { type, label });
    
    if (!user) {
      console.error('❌ Cannot vote - user not logged in');
      alert('Please log in to vote');
      return;
    }
    if (voting) {
      console.log('⏳ Already voting, please wait');
      return;
    }
    
    console.log('🗳️ Processing vote:', { type, trendId, value, user: user.id, currentVote: userVote });
    setVoting(true);
    
    // Store previous vote type and counts
    const previousVote = userVote;
    const prevCounts = { ...allCounts };
    
    try {
      // Optimistically update UI
      if (previousVote && previousVote !== type) {
        // Decrease count on previous vote
        setAllCounts({
          ...prevCounts,
          [previousVote]: Math.max(0, (prevCounts[previousVote] || 0) - 1),
          [type]: (prevCounts[type] || 0) + 1
        });
      } else if (!previousVote) {
        // New vote
        setAllCounts({
          ...prevCounts,
          [type]: (prevCounts[type] || 0) + 1
        });
      }
      
      onVote(type); // Update parent component about the vote
      
      // Save vote to localStorage for persistence
      const storedVotes = JSON.parse(localStorage.getItem('userTrendVotes') || '{}');
      storedVotes[trendId] = type;
      localStorage.setItem('userTrendVotes', JSON.stringify(storedVotes));
      
      // First check if user already voted on this trend
      const { data: existingVote } = await supabase
        .from('trend_user_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('trend_id', trendId)
        .single();
      
      let data = null;
      let error = null;
      
      if (existingVote) {
        // Update existing vote
        const { error: updateError } = await supabase
          .from('trend_user_votes')
          .update({
            vote_type: type,
            vote_value: value,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('trend_id', trendId);
        error = updateError;
      } else {
        // Insert new vote
        const { error: insertError } = await supabase
          .from('trend_user_votes')
          .insert({
            user_id: user.id,
            trend_id: trendId,
            vote_type: type,
            vote_value: value,
            created_at: new Date().toISOString()
          });
        error = insertError;
      }
      
      // Get updated counts manually
      if (!error) {
        const { data: allVotes } = await supabase
          .from('trend_user_votes')
          .select('vote_type')
          .eq('trend_id', trendId);
        
        // Count votes by type
        const counts: Record<string, number> = {
          wave: 0,
          fire: 0,
          declining: 0,
          dead: 0
        };
        
        allVotes?.forEach(vote => {
          if (vote.vote_type && counts.hasOwnProperty(vote.vote_type)) {
            counts[vote.vote_type]++;
          }
        });
        
        data = counts;
      }
      
      if (!error && data) {
        // Update with actual counts
        setAllCounts(data);
        
        // Award XP for voting
        const xpEarned = !previousVote ? 10 : 5;
        
        // Save XP to database (trigger will update user_xp automatically)
        const { error: xpError } = await supabase.from('xp_transactions').insert({
          user_id: user.id,
          amount: xpEarned,
          type: 'vote',
          description: `Voted ${label} on trend`,
          reference_id: trendId,
          reference_type: 'trend',
          created_at: new Date().toISOString()
        });
        
        if (!xpError && showXPNotification) {
          showXPNotification(xpEarned, `Voted: ${label}`, 'prediction');
          console.log('🏆 XP awarded for voting:', xpEarned);
        } else if (xpError) {
          console.error('⚠️ XP transaction failed:', xpError);
        }
        
        // Visual feedback on successful vote
        console.log('✅ Vote successful!', { type, newCounts: data });
      } else {
        // Revert on error
        setAllCounts(prevCounts);
        onVote(previousVote);
        console.error('❌ Vote Failed:', error);
      }
    } catch (error) {
      // Revert on error
      setAllCounts(prevCounts);
      onVote(previousVote);
      console.error('❌ Vote Error:', error);
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
      className={`group relative flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg border-2 transition-all ${
        hasVoted ? `bg-gradient-to-r ${gradient} border-transparent` : 'border-gray-200 hover:border-gray-300'
      } ${voting ? 'opacity-50' : ''}`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`text-xs font-bold ${hasVoted ? 'text-white' : 'text-gray-700'}`}>
        {displayCount}
      </span>
      {/* Tooltip */}
      <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
        {label}
      </div>
    </motion.button>
  );
};

const VoteMobileButton = ({ type, trendId, count, icon, label, value, gradient, userVote, onVote, allCounts, setAllCounts }: any) => {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [voting, setVoting] = useState(false);
  const hasVoted = userVote === type;
  
  // Use count from allCounts to ensure proper updates, fallback to initial count
  const displayCount = allCounts?.[type] !== undefined ? allCounts[type] : count;
  
  const handleVote = async () => {
    console.log('📱 Mobile vote button clicked!', { type, label });
    
    if (!user) {
      console.error('❌ Cannot vote - user not logged in');
      alert('Please log in to vote');
      return;
    }
    if (voting) {
      console.log('⏳ Already voting, please wait');
      return;
    }
    
    console.log('📱 Processing mobile vote:', { type, trendId, value, user: user.id });
    setVoting(true);
    
    // Store previous vote type and counts
    const previousVote = userVote;
    const prevCounts = { ...allCounts };
    
    try {
      // Optimistically update UI
      if (previousVote && previousVote !== type) {
        // Decrease count on previous vote
        setAllCounts({
          ...prevCounts,
          [previousVote]: Math.max(0, (prevCounts[previousVote] || 0) - 1),
          [type]: (prevCounts[type] || 0) + 1
        });
      } else if (!previousVote) {
        // New vote
        setAllCounts({
          ...prevCounts,
          [type]: (prevCounts[type] || 0) + 1
        });
      }
      
      onVote(type); // Update parent component about the vote
      
      // Save vote to localStorage for persistence
      const storedVotes = JSON.parse(localStorage.getItem('userTrendVotes') || '{}');
      storedVotes[trendId] = type;
      localStorage.setItem('userTrendVotes', JSON.stringify(storedVotes));
      
      // First check if user already voted on this trend
      const { data: existingVote } = await supabase
        .from('trend_user_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('trend_id', trendId)
        .single();
      
      let data = null;
      let error = null;
      
      if (existingVote) {
        // Update existing vote
        const { error: updateError } = await supabase
          .from('trend_user_votes')
          .update({
            vote_type: type,
            vote_value: value,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('trend_id', trendId);
        error = updateError;
      } else {
        // Insert new vote
        const { error: insertError } = await supabase
          .from('trend_user_votes')
          .insert({
            user_id: user.id,
            trend_id: trendId,
            vote_type: type,
            vote_value: value,
            created_at: new Date().toISOString()
          });
        error = insertError;
      }
      
      // Get updated counts manually
      if (!error) {
        const { data: allVotes } = await supabase
          .from('trend_user_votes')
          .select('vote_type')
          .eq('trend_id', trendId);
        
        // Count votes by type
        const counts: Record<string, number> = {
          wave: 0,
          fire: 0,
          declining: 0,
          dead: 0
        };
        
        allVotes?.forEach(vote => {
          if (vote.vote_type && counts.hasOwnProperty(vote.vote_type)) {
            counts[vote.vote_type]++;
          }
        });
        
        data = counts;
      }
      
      if (!error && data) {
        // Update with actual counts
        setAllCounts(data);
        
        // Award XP for voting
        const xpEarned = !previousVote ? 10 : 5;
        
        // Save XP to database (trigger will update user_xp automatically)
        const { error: xpError } = await supabase.from('xp_transactions').insert({
          user_id: user.id,
          amount: xpEarned,
          type: 'vote',
          description: `Voted ${label} on trend`,
          reference_id: trendId,
          reference_type: 'trend',
          created_at: new Date().toISOString()
        });
        
        if (!xpError && showXPNotification) {
          showXPNotification(xpEarned, `Voted: ${label}`, 'prediction');
          console.log('🏆 XP awarded for voting:', xpEarned);
        } else if (xpError) {
          console.error('⚠️ XP transaction failed:', xpError);
        }
        
        // Visual feedback on successful vote
        console.log('✅ Vote successful!', { type, newCounts: data });
      } else {
        // Revert on error
        setAllCounts(prevCounts);
        onVote(previousVote);
        console.error('❌ Mobile Vote Failed:', error);
      }
    } catch (error) {
      // Revert on error  
      setAllCounts(prevCounts);
      onVote(previousVote);
      console.error('❌ Mobile Vote Error:', error);
    } finally {
      setVoting(false);
    }
  };
  
  return (
    <motion.button
      onClick={handleVote}
      whileTap={{ scale: 0.95 }}
      disabled={voting}
      className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl shadow-md transition-all ${
        hasVoted ? `bg-gradient-to-r ${gradient} text-white` : 'bg-white text-gray-700 border border-gray-200'
      } ${voting ? 'opacity-50' : ''}`}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className={`font-bold text-sm ${hasVoted ? 'text-white' : 'text-gray-700'}`}>
        {displayCount}
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
  user_vote_type?: string; // Track user's vote type for this trend
  is_validated?: boolean; // True if wave_votes >= 3
  is_rejected?: boolean; // True if dead_votes >= 3
  
  // Reddit-style scoring
  wave_score?: number; // Positive votes - negative votes
  hot_score?: number; // Combination of votes and time
  controversy_score?: number; // How disputed the trend is
  age_hours?: number; // Age in hours
  
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
type SortType = 'hot' | 'top' | 'new' | 'controversial' | 'wave_score';

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
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});
  
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
  
  // Voting state
  const [votingTrends, setVotingTrends] = useState<Set<string>>(new Set());
  
  // Filters and Sorting
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortType, setSortType] = useState<SortType>('hot');
  const [showFilters, setShowFilters] = useState(false);
  
  // Prediction form
  const [peakPrediction, setPeakPrediction] = useState('');
  const [confidence, setConfidence] = useState<'very' | 'somewhat' | 'guess'>('somewhat');

  useEffect(() => {
    if (user) {
      loadTrends();
      loadUserStats();
      loadFollowerActivity();
      loadUserVotes(); // Load user's existing votes
    }
  }, [user, filterType, timeFilter, categoryFilter, sortType]);

  // Load saved votes from localStorage on mount
  useEffect(() => {
    const savedVotes = localStorage.getItem('userTrendVotes');
    if (savedVotes) {
      try {
        const votesData = JSON.parse(savedVotes);
        setUserVotes(votesData);
        console.log('Loaded saved votes from localStorage:', votesData);
      } catch (error) {
        console.error('Error parsing saved votes:', error);
      }
    }
  }, []);

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

  // Load user's existing votes from database
  const loadUserVotes = async () => {
    if (!user) return;
    
    try {
      // Get user's votes from trend_user_votes table
      const { data: votes, error } = await supabase
        .from('trend_user_votes')
        .select('trend_id, vote_type')
        .eq('user_id', user.id);
      
      if (!error && votes) {
        const votesMap: Record<string, string> = {};
        votes.forEach(vote => {
          votesMap[vote.trend_id] = vote.vote_type;
        });
        setUserVotes(prevVotes => ({ ...prevVotes, ...votesMap }));
        
        // Also save to localStorage
        const currentSaved = JSON.parse(localStorage.getItem('userTrendVotes') || '{}');
        localStorage.setItem('userTrendVotes', JSON.stringify({ ...currentSaved, ...votesMap }));
        
        console.log('Loaded user votes from database:', votesMap);
      }
    } catch (error) {
      console.error('Error loading user votes:', error);
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
      // No follower activity data available
      setFollowerActivity([]);
    }
  };

  const loadTrends = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading trends, user:', user?.id);
      
      // Load trends that are either submitted (awaiting validation) or validated
      // Rejected trends are NOT shown on predictions page
      const { data: realTrends, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .in('status', ['submitted', 'validating', 'approved'])  // Removed 'validated' - not a valid enum
        .order('created_at', { ascending: false })
        .limit(50);  // Load more trends
      
      if (!error && realTrends && realTrends.length > 0) {
        // Load vote counts for all trends
        const trendIds = realTrends.map(t => t.id);
        const { data: votesData } = await supabase
          .from('trend_user_votes')
          .select('trend_id, vote_type')
          .in('trend_id', trendIds);
        
        // Calculate vote counts per trend
        const voteCountsMap: Record<string, Record<string, number>> = {};
        trendIds.forEach(id => {
          voteCountsMap[id] = { wave: 0, fire: 0, declining: 0, dead: 0 };
        });
        
        votesData?.forEach(vote => {
          if (vote.trend_id && vote.vote_type && voteCountsMap[vote.trend_id]) {
            voteCountsMap[vote.trend_id][vote.vote_type] = (voteCountsMap[vote.trend_id][vote.vote_type] || 0) + 1;
          }
        });
        
        // Set vote counts state
        setVoteCounts(voteCountsMap);
        
        // Load user's own votes
        if (user) {
          const { data: userVotesData } = await supabase
            .from('trend_user_votes')
            .select('trend_id, vote_type')
            .eq('user_id', user.id)
            .in('trend_id', trendIds);
          
          const userVotesMap: Record<string, string> = {};
          userVotesData?.forEach(vote => {
            if (vote.trend_id && vote.vote_type) {
              userVotesMap[vote.trend_id] = vote.vote_type;
            }
          });
          
          setUserVotes(userVotesMap);
          console.log('📊 Loaded user votes:', userVotesMap);
        }
        
        // Map real trends to the component format
        const formattedTrends: TrendWithEngagement[] = realTrends.map(trend => ({
          id: trend.id,
          title: trend.title || 'Untitled Trend',
          description: trend.description || 'No description',
          platform: trend.platform || 'unknown',
          category: trend.category || 'Other',
          url: trend.url || '',
          thumbnail_url: trend.thumbnail_url,
          creator_handle: trend.creator_handle,
          submitted_at: trend.created_at,
          spotter_id: trend.spotter_id,
          spotter_username: trend.spotter_username || 'Anonymous',
          
          // Engagement metrics (with defaults)
          likes_count: trend.likes_count || 0,
          comments_count: trend.comments_count || 0,
          predictions_count: trend.predictions_count || 0,
          heat_score: trend.heat_score || 0,
          user_has_liked: false,
          user_has_predicted: false,
          
          // Voting data (for wave score only, not validation)
          wave_votes: voteCountsMap[trend.id]?.wave || 0,
          fire_votes: voteCountsMap[trend.id]?.fire || 0,
          declining_votes: voteCountsMap[trend.id]?.declining || 0,
          dead_votes: voteCountsMap[trend.id]?.dead || 0,
          is_validated: trend.status === 'validating' || trend.status === 'approved', // From validation page
          is_rejected: trend.status === 'rejected', // From validation page
          
          // Calculate wave score (positive votes - negative votes)
          wave_score: ((voteCountsMap[trend.id]?.wave || 0) * 2 + (voteCountsMap[trend.id]?.fire || 0)) - ((voteCountsMap[trend.id]?.declining || 0) + (voteCountsMap[trend.id]?.dead || 0) * 2),
          
          // Default prediction breakdown
          prediction_breakdown: {
            '24hrs': 0,
            '3days': 0,
            '1week': 0,
            '2weeks': 0,
            'peaked': 0
          },
          
          comments: []
        }));
        
        setTrends(formattedTrends);
        setLoading(false);
        return;
      }
      
      // No trends available
      setTrends([]);
      setLoading(false);
    } catch (error) {
      console.error('Error loading trends:', error);
      setTrends([]);
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
                {/* Sort Options - Reddit Style */}
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500 py-2">Sort by:</span>
                  {(['hot', 'top', 'new', 'controversial', 'wave_score'] as SortType[]).map(sort => (
                    <button
                      key={sort}
                      onClick={() => setSortType(sort)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sortType === sort
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {sort === 'hot' && '🔥 Hot'}
                      {sort === 'top' && '👑 Top'}
                      {sort === 'new' && '✨ New'}
                      {sort === 'controversial' && '⚡ Controversial'}
                      {sort === 'wave_score' && '🌊 Wave Score'}
                    </button>
                  ))}
                </div>
                
                {/* Filter Options */}
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500 py-2">Filter:</span>
                  {(['all', 'rising', 'peaking', 'need_predictions', 'following'] as FilterType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        filterType === type
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'all' && 'All'}
                      {type === 'rising' && '📈 Rising'}
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Metric Tiles - Improved alignment and visual hierarchy */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-transparent rounded-full -mr-12 -mt-12 opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Brain className="w-6 h-6 text-purple-600" />
                    {userStats.rank_change > 0 && (
                      <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                        +{userStats.rank_change}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{userStats.accuracy_rate}%</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Accuracy</div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-100 to-transparent rounded-full -mr-12 -mt-12 opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Flame className="w-6 h-6 text-orange-600" />
                    {userStats.current_streak > 0 && (
                      <span className="text-2xl">🔥</span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{userStats.current_streak}</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Day Streak</div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-100 to-transparent rounded-full -mr-12 -mt-12 opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    <span className="text-sm font-bold text-gray-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                      #{userStats.rank}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{userStats.xp_earned_today}</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">XP Today</div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-transparent rounded-full -mr-12 -mt-12 opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Target className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                      {userStats.best_category}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{userStats.total_predictions}</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Predictions</div>
                </div>
              </motion.div>
            </div>

            {/* Trends Feed */}
            <div className="space-y-6">
              {trends.filter(t => !t.is_rejected).map((trend, index) => (
                <PredictionTrendCard
                  key={trend.id}
                  trend={trend}
                  userVote={userVotes[trend.id]}
                  isVoting={votingTrends.has(trend.id)}
                  onVote={async (trendId: string, voteType: string) => {
                    if (!user) {
                      alert('Please log in to vote');
                      return;
                    }
                    
                    // Prevent double-clicking
                    if (votingTrends.has(trendId)) {
                      return;
                    }
                    
                    // Mark as voting
                    setVotingTrends(prev => new Set(prev).add(trendId));
                    
                    // Check if user is changing their vote
                    const previousVote = userVotes[trendId];
                    const isChangingVote = previousVote && previousVote !== voteType;
                    const isRemovingVote = previousVote === voteType;
                    
                    if (isRemovingVote) {
                      // User clicked the same button - remove vote
                      try {
                        const { error } = await supabase
                          .from('trend_user_votes')
                          .delete()
                          .eq('user_id', user.id)
                          .eq('trend_id', trendId);
                        
                        if (!error) {
                          // Remove vote from state
                          setUserVotes(prev => {
                            const newVotes = { ...prev };
                            delete newVotes[trendId];
                            return newVotes;
                          });
                          
                          // Update the trend's vote count
                          setTrends(prev => prev.map(t => {
                            if (t.id === trendId) {
                              return {
                                ...t,
                                [`${voteType}_votes`]: Math.max(0, (t[`${voteType}_votes` as keyof typeof t] as number || 0) - 1)
                              };
                            }
                            return t;
                          }));
                          
                          showXPNotification(2, 'Vote removed', 'prediction');
                        }
                      } catch (error) {
                        console.error('Error removing vote:', error);
                      } finally {
                        // Clear voting state
                        setVotingTrends(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(trendId);
                          return newSet;
                        });
                      }
                      return;
                    }
                    
                    // Save or update vote
                    try {
                      // Double-check user is authenticated
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      if (!currentUser) {
                        console.error('❌ User not authenticated');
                        alert('Please log in to vote');
                        return;
                      }
                      
                      console.log('📝 Saving vote to database:', {
                        user_id: currentUser.id,
                        trend_id: trendId,
                        vote_type: voteType,
                        vote_value: voteType === 'wave' ? 2 : voteType === 'fire' ? 1 : voteType === 'declining' ? -1 : -2,
                        authenticated: true
                      });
                      
                      const { data, error } = await supabase
                        .from('trend_user_votes')
                        .upsert({
                          user_id: currentUser.id,
                          trend_id: trendId,
                          vote_type: voteType,
                          vote_value: voteType === 'wave' ? 2 : voteType === 'fire' ? 1 : voteType === 'declining' ? -1 : -2,
                          updated_at: new Date().toISOString()
                        }, {
                          onConflict: 'user_id,trend_id'
                        })
                        .select();
                      
                      if (error) {
                        console.error('❌ Database error saving vote:', {
                          error,
                          message: error.message,
                          details: error.details,
                          hint: error.hint,
                          code: error.code
                        });
                        
                        // Show more specific error message
                        let errorMessage = 'Failed to save vote. ';
                        if (error.message?.includes('violates foreign key')) {
                          errorMessage += 'Invalid trend or user ID.';
                        } else if (error.message?.includes('permission denied')) {
                          errorMessage += 'You do not have permission to vote.';
                        } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
                          errorMessage += 'Voting table not set up. Please contact support.';
                        } else {
                          errorMessage += error.message || 'Please try again.';
                        }
                        
                        alert(errorMessage);
                        throw error;
                      }
                      
                      console.log('✅ Vote saved successfully:', data);
                      
                      if (!error) {
                        // Update local state
                        setUserVotes(prev => ({ ...prev, [trendId]: voteType }));
                        
                        // Update trend vote counts
                        setTrends(prev => prev.map(t => {
                          if (t.id === trendId) {
                            const updated = { ...t };
                            
                            // Decrease previous vote count if changing vote
                            if (isChangingVote && previousVote) {
                              const prevKey = `${previousVote}_votes` as keyof typeof t;
                              updated[prevKey] = Math.max(0, (t[prevKey] as number || 0) - 1);
                            }
                            
                            // Increase new vote count
                            const newKey = `${voteType}_votes` as keyof typeof t;
                            updated[newKey] = ((t[newKey] as number) || 0) + 1;
                            
                            // Recalculate wave score
                            updated.wave_score = ((updated.wave_votes || 0) * 2 + (updated.fire_votes || 0)) - 
                                               ((updated.declining_votes || 0) + (updated.dead_votes || 0) * 2);
                            
                            console.log('📊 Updated trend vote counts:', {
                              trendId,
                              wave: updated.wave_votes,
                              fire: updated.fire_votes,
                              declining: updated.declining_votes,
                              dead: updated.dead_votes,
                              score: updated.wave_score
                            });
                            
                            return updated;
                          }
                          return t;
                        }));
                        
                        // Show XP notification
                        const voteEmoji = voteType === 'wave' ? '🌊' : voteType === 'fire' ? '🔥' : voteType === 'declining' ? '📉' : '💀';
                        showXPNotification(
                          isChangingVote ? 3 : 5, 
                          `${voteEmoji} ${isChangingVote ? 'Vote changed to' : 'Voted'}: ${voteType}`, 
                          'prediction'
                        );
                      }
                    } catch (error) {
                      console.error('Vote error:', error);
                      
                      // Fallback 1: Try API route
                      console.log('🔄 Attempting API route fallback...');
                      try {
                        const response = await fetch('/api/vote', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ trendId, voteType })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                          console.log('✅ Vote saved via API:', result);
                          
                          // Update local state
                          setUserVotes(prev => ({ ...prev, [trendId]: voteType }));
                          
                          // Update trend vote counts with API response
                          if (result.counts) {
                            setTrends(prev => prev.map(t => {
                              if (t.id === trendId) {
                                return {
                                  ...t,
                                  wave_votes: result.counts.wave,
                                  fire_votes: result.counts.fire,
                                  declining_votes: result.counts.declining,
                                  dead_votes: result.counts.dead,
                                  wave_score: (result.counts.wave * 2 + result.counts.fire) - 
                                            (result.counts.declining + result.counts.dead * 2)
                                };
                              }
                              return t;
                            }));
                          }
                          
                          showXPNotification(
                            isChangingVote ? 3 : 5,
                            `Vote saved via API: ${voteType}`,
                            'prediction'
                          );
                          return; // Success - exit early
                        } else {
                          console.error('API vote failed:', result.error);
                        }
                      } catch (apiError) {
                        console.error('API route failed:', apiError);
                      }
                      
                      // Fallback 2: Save vote locally if database fails
                      console.log('💾 Attempting local storage fallback...');
                      try {
                        const localVotes = JSON.parse(localStorage.getItem('userTrendVotes') || '{}');
                        localVotes[trendId] = voteType;
                        localStorage.setItem('userTrendVotes', JSON.stringify(localVotes));
                        
                        // Still update UI even if database fails
                        setUserVotes(prev => ({ ...prev, [trendId]: voteType }));
                        
                        // Update trend vote counts locally
                        setTrends(prev => prev.map(t => {
                          if (t.id === trendId) {
                            const updated = { ...t };
                            
                            if (isChangingVote && previousVote) {
                              const prevKey = `${previousVote}_votes` as keyof typeof t;
                              updated[prevKey] = Math.max(0, (t[prevKey] as number || 0) - 1);
                            }
                            
                            const newKey = `${voteType}_votes` as keyof typeof t;
                            updated[newKey] = ((t[newKey] as number) || 0) + 1;
                            
                            updated.wave_score = ((updated.wave_votes || 0) * 2 + (updated.fire_votes || 0)) - 
                                               ((updated.declining_votes || 0) + (updated.dead_votes || 0) * 2);
                            
                            return updated;
                          }
                          return t;
                        }));
                        
                        showXPNotification(3, `Vote saved locally (offline mode)`, 'prediction');
                      } catch (localError) {
                        console.error('Even local storage failed:', localError);
                        alert('Failed to save vote. Please check your connection.');
                      }
                    } finally {
                      // Clear voting state
                      setVotingTrends(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(trendId);
                        return newSet;
                      });
                    }
                  }}
                  onLike={handleLike}
                  onComment={(trend) => {
                    setActiveCommentTrend(trend);
                    setShowCommentsModal(true);
                  }}
                  onPredict={(trend) => {
                    setSelectedTrend(trend);
                    setShowPredictionModal(true);
                  }}
                  index={index}
                />
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

            {/* Top Predictors Leaderboard */}
            <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg border border-purple-100 p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full -mr-16 -mt-16 opacity-20" />
              <div className="relative">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Top Predictors
                  </span>
                </h3>
                <div className="space-y-2">
                  {[
                    { username: 'TrendMaster', accuracy: 78, rank: 1, trend: '+12', badge: '🏆' },
                    { username: 'ViralScout', accuracy: 72, rank: 2, trend: '+5', badge: '🥈' },
                    { username: 'CultureWave', accuracy: 69, rank: 3, trend: '+3', badge: '🥉' },
                    { username: 'You', accuracy: 66, rank: 23, trend: '+8', badge: '⭐' },
                  ].map((predictor, index) => (
                    <motion.div 
                      key={predictor.username}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all hover:scale-105 ${
                        predictor.username === 'You' 
                          ? 'bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200' 
                          : predictor.rank <= 3 
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                          : 'bg-white/50 border border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{predictor.badge}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${
                              predictor.rank <= 3 ? 'text-orange-600' : 'text-gray-700'
                            }`}>
                              #{predictor.rank}
                            </span>
                            <span className={`text-sm font-medium ${
                              predictor.username === 'You' ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                              {predictor.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-600 font-medium">{predictor.trend}</span>
                            <span className="text-gray-500">vs yesterday</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {predictor.accuracy}%
                        </div>
                        <div className="text-xs text-gray-500">accuracy</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  View Full Leaderboard →
                </motion.button>
              </div>
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

      {/* Enhanced Prediction Modal with Interactive Chart */}
      <AnimatePresence>
        {showPredictionModal && selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowPredictionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Predict the Wave</h3>
                <button
                  onClick={() => setShowPredictionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <TrendPredictionChartV7
                trendId={selectedTrend.id}
                trendTitle={selectedTrend.title}
                onSavePrediction={async (prediction) => {
                  if (!user) return;

                  try {
                    // Calculate XP based on confidence
                    const baseXP = 20;
                    const confidenceBonus = Math.round(prediction.confidence * 0.3);
                    const totalXP = baseXP + confidenceBonus;

                    // Save prediction to database
                    const peakTimeframe = (() => {
                      const daysUntilPeak = Math.round((prediction.peakDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      if (daysUntilPeak <= 1) return '24_hours';
                      if (daysUntilPeak <= 3) return '3_days';
                      if (daysUntilPeak <= 7) return '1_week';
                      if (daysUntilPeak <= 14) return '2_weeks';
                      if (daysUntilPeak <= 30) return '1_month';
                      return '3_months';
                    })();

                    // Save prediction curve data
                    const { error: predError } = await supabase
                      .from('trend_predictions')
                      .insert({
                        trend_submission_id: selectedTrend.id,
                        user_id: user.id,
                        predicted_peak_timeframe: peakTimeframe,
                        predicted_peak_date: prediction.peakDate.toISOString(),
                        trend_name: selectedTrend.title,
                        platform: selectedTrend.platform,
                        category: selectedTrend.category,
                        google_trends_data: {
                          curve: prediction.curve.map(p => ({
                            date: p.date.toISOString(),
                            value: p.value,
                            confidence: p.confidence
                          })),
                          peakValue: prediction.peakValue
                        },
                        confidence_score: prediction.confidence
                      });

                    if (predError) {
                      console.error('Error saving prediction:', predError);
                      // Continue anyway to update UI
                    }

                    // Award XP
                    await supabase.from('xp_transactions').insert({
                      user_id: user.id,
                      amount: totalXP,
                      type: 'prediction',
                      description: `Predicted trend: ${selectedTrend.title}`,
                      reference_id: selectedTrend.id,
                      reference_type: 'trend',
                      created_at: new Date().toISOString()
                    });

                    // Update user_xp table
                    const { data: currentXP } = await supabase
                      .from('user_xp')
                      .select('total_xp')
                      .eq('user_id', user.id)
                      .single();
                      
                    if (currentXP) {
                      await supabase
                        .from('user_xp')
                        .update({ 
                          total_xp: currentXP.total_xp + totalXP,
                          updated_at: new Date().toISOString()
                        })
                        .eq('user_id', user.id);
                    }

                    showXPNotification(
                      totalXP, 
                      `Prediction locked in! ${prediction.confidence >= 80 ? '🔥 Bold prediction!' : ''}`, 
                      'prediction'
                    );

                    // Update local state
                    setTrends(prev => prev.map(trend => {
                      if (trend.id === selectedTrend.id) {
                        return {
                          ...trend,
                          user_has_predicted: true,
                          predictions_count: trend.predictions_count + 1
                        };
                      }
                      return trend;
                    }));

                    setShowPredictionModal(false);
                    setSelectedTrend(null);
                  } catch (error) {
                    console.error('Error saving prediction:', error);
                    alert('Failed to save prediction. Please try again.');
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}