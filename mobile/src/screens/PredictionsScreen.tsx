import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../hooks/useAuth';
import { useXPNotification } from '../contexts/XPNotificationContext';
import { supabase } from '../config/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Trend {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  thumbnail_url?: string;
  spotter_username: string;
  submitted_at: string;
  wave_votes: number;
  fire_votes: number;
  declining_votes: number;
  dead_votes: number;
  comments_count: number;
  predictions_count: number;
  heat_score: number;
  user_has_predicted: boolean;
  wave_score: number;
  is_validated: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  comment: string;
  created_at: string;
}

const VoteButton: React.FC<{
  type: 'wave' | 'fire' | 'declining' | 'dead';
  count: number;
  isActive: boolean;
  onPress: () => void;
}> = ({ type, count, isActive, onPress }) => {
  const icons = {
    wave: '🌊',
    fire: '🔥',
    declining: '📉',
    dead: '💀',
  };

  const colors = {
    wave: ['#3B82F6', '#06B6D4'],
    fire: ['#F97316', '#EF4444'],
    declining: ['#F59E0B', '#FCD34D'],
    dead: ['#6B7280', '#374151'],
  };

  return (
    <Pressable onPress={onPress} style={styles.voteButton}>
      <LinearGradient
        colors={isActive ? colors[type] : ['#1F2937', '#111827']}
        style={styles.voteButtonGradient}
      >
        <Text style={styles.voteIcon}>{icons[type]}</Text>
        <Text style={styles.voteCount}>{count}</Text>
      </LinearGradient>
    </Pressable>
  );
};

export const PredictionsScreen: React.FC = () => {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedTrendStats, setSelectedTrendStats] = useState<any>(null);

  useEffect(() => {
    loadTrends();
    loadUserVotes();
  }, [user]);

  const loadTrends = async () => {
    try {
      // Load validated trends for predictions
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          trend_user_votes!trend_id (
            vote_type
          )
        `)
        .eq('status', 'quality_approved')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Process trends to count votes
      const processedTrends = data?.map(trend => {
        const votes = trend.trend_user_votes || [];
        const voteCounts = votes.reduce((acc: any, vote: any) => {
          if (vote.vote_type) {
            acc[vote.vote_type] = (acc[vote.vote_type] || 0) + 1;
          }
          return acc;
        }, { wave: 0, fire: 0, declining: 0, dead: 0 });

        return {
          id: trend.id,
          title: trend.title || trend.trend_headline || 'Untitled',
          description: trend.description || trend.why_trending || '',
          platform: trend.platform || 'unknown',
          category: trend.category || 'lifestyle',
          thumbnail_url: trend.thumbnail_url,
          spotter_username: 'Trend Spotter',
          submitted_at: trend.created_at,
          wave_votes: voteCounts.wave || 0,
          fire_votes: voteCounts.fire || 0,
          declining_votes: voteCounts.declining || 0,
          dead_votes: voteCounts.dead || 0,
          comments_count: 0,
          predictions_count: 0,
          heat_score: ((voteCounts.wave + voteCounts.fire) / Math.max(1, Object.values(voteCounts).reduce((a: number, b: number) => a + b, 0))) * 100,
          user_has_predicted: false,
          wave_score: voteCounts.wave - voteCounts.dead,
          is_validated: true,
        };
      }) || [];

      setTrends(processedTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
      Alert.alert('Error', 'Failed to load trends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserVotes = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('trend_user_votes')
        .select('trend_id, vote_type')
        .eq('user_id', user.id);

      const votes: Record<string, string> = {};
      data?.forEach(vote => {
        votes[vote.trend_id] = vote.vote_type;
      });
      setUserVotes(votes);
    } catch (error) {
      console.error('Error loading user votes:', error);
    }
  };

  const handleVote = async (trendId: string, voteType: 'wave' | 'fire' | 'declining' | 'dead') => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to vote on trends');
      return;
    }

    const previousVote = userVotes[trendId];
    const isChangingVote = previousVote && previousVote !== voteType;

    // Optimistically update UI
    setUserVotes(prev => ({ ...prev, [trendId]: voteType }));
    setTrends(prev => prev.map(trend => {
      if (trend.id === trendId) {
        const updated = { ...trend };
        if (previousVote) {
          updated[`${previousVote}_votes` as keyof Trend] = Math.max(0, (updated[`${previousVote}_votes` as keyof Trend] as number) - 1);
        }
        updated[`${voteType}_votes` as keyof Trend] = ((updated[`${voteType}_votes` as keyof Trend] as number) || 0) + 1;
        return updated;
      }
      return trend;
    }));

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('trend_user_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('trend_id', trendId)
        .single();

      if (existingVote) {
        // Update existing vote
        await supabase
          .from('trend_user_votes')
          .update({
            vote_type: voteType,
            vote_value: voteType === 'wave' ? 100 : voteType === 'fire' ? 75 : voteType === 'declining' ? 25 : 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('trend_id', trendId);
      } else {
        // Insert new vote
        await supabase
          .from('trend_user_votes')
          .insert({
            user_id: user.id,
            trend_id: trendId,
            vote_type: voteType,
            vote_value: voteType === 'wave' ? 100 : voteType === 'fire' ? 75 : voteType === 'declining' ? 25 : 0,
            created_at: new Date().toISOString()
          });
      }

      // Award XP for voting
      const xpEarned = !previousVote ? 10 : 5;
      const voteLabels = {
        wave: 'Wave 🌊',
        fire: 'Fire 🔥',
        declining: 'Declining 📉',
        dead: 'Dead 💀',
      };

      await supabase.from('xp_transactions').insert({
        user_id: user.id,
        amount: xpEarned,
        type: 'vote',
        description: `Voted ${voteLabels[voteType]} on trend`,
        reference_id: trendId,
        reference_type: 'trend',
        created_at: new Date().toISOString()
      });

      showXPNotification(xpEarned, `Voted: ${voteLabels[voteType]}`, 'prediction');
    } catch (error) {
      console.error('Error voting:', error);
      // Revert on error
      setUserVotes(prev => {
        const updated = { ...prev };
        if (previousVote) {
          updated[trendId] = previousVote;
        } else {
          delete updated[trendId];
        }
        return updated;
      });
      Alert.alert('Error', 'Failed to submit vote');
    }
  };

  const handleComment = async () => {
    if (!selectedTrend || !commentText.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('trend_comments')
        .insert({
          trend_id: selectedTrend.id,
          user_id: user.id,
          comment: commentText.trim(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Award XP for commenting
      await supabase.from('xp_transactions').insert({
        user_id: user.id,
        amount: 5,
        type: 'comment',
        description: 'Added comment to trend',
        reference_id: selectedTrend.id,
        reference_type: 'trend',
        created_at: new Date().toISOString()
      });

      showXPNotification(5, 'Comment posted!', 'bonus');

      // Add comment to local state
      const newComment: Comment = {
        id: Date.now().toString(),
        user_id: user.id,
        username: 'You',
        comment: commentText.trim(),
        created_at: 'Just now',
      };
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    }
  };

  const handleShowStats = async (trend: Trend) => {
    setSelectedTrendStats(trend);
    setShowStatsModal(true);

    try {
      // Load all activity for this trend
      const [votesRes, commentsRes] = await Promise.all([
        supabase
          .from('trend_user_votes')
          .select('*, profiles:user_id(username)')
          .eq('trend_id', trend.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trend_comments')
          .select('*, profiles:user_id(username)')
          .eq('trend_id', trend.id)
          .order('created_at', { ascending: false })
      ]);

      setSelectedTrendStats({
        ...trend,
        activityVotes: votesRes.data || [],
        activityComments: commentsRes.data || [],
      });
    } catch (error) {
      console.error('Error loading trend stats:', error);
    }
  };

  const renderTrendCard = ({ item: trend }: { item: Trend }) => {
    const userVote = userVotes[trend.id];
    
    return (
      <Animated.View entering={FadeIn.delay(100)}>
        <GlassCard style={styles.trendCard}>
          {/* Header */}
          <View style={styles.trendHeader}>
            <View style={styles.platformBadge}>
              <Text style={styles.platformText}>{trend.platform}</Text>
            </View>
            {trend.is_validated && (
              <View style={styles.verifiedBadge}>
                <Icon name="check-circle" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <Text style={styles.trendTitle}>{trend.title}</Text>
          {trend.description && (
            <Text style={styles.trendDescription} numberOfLines={2}>
              {trend.description}
            </Text>
          )}

          {/* Heat Score */}
          <View style={styles.heatContainer}>
            <Icon 
              name={trend.heat_score > 80 ? 'fire' : trend.heat_score > 50 ? 'trending-up' : 'thermometer'}
              size={16} 
              color={trend.heat_score > 80 ? '#EF4444' : trend.heat_score > 50 ? '#F59E0B' : '#3B82F6'}
            />
            <Text style={styles.heatText}>
              {trend.heat_score.toFixed(0)}% Heat
            </Text>
          </View>

          {/* Vote Buttons */}
          <View style={styles.voteContainer}>
            <VoteButton
              type="wave"
              count={trend.wave_votes}
              isActive={userVote === 'wave'}
              onPress={() => handleVote(trend.id, 'wave')}
            />
            <VoteButton
              type="fire"
              count={trend.fire_votes}
              isActive={userVote === 'fire'}
              onPress={() => handleVote(trend.id, 'fire')}
            />
            <VoteButton
              type="declining"
              count={trend.declining_votes}
              isActive={userVote === 'declining'}
              onPress={() => handleVote(trend.id, 'declining')}
            />
            <VoteButton
              type="dead"
              count={trend.dead_votes}
              isActive={userVote === 'dead'}
              onPress={() => handleVote(trend.id, 'dead')}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                setSelectedTrend(trend);
                setShowCommentModal(true);
              }}
            >
              <Icon name="comment" size={18} color="#64748B" />
              <Text style={styles.actionText}>{trend.comments_count}</Text>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={() => handleShowStats(trend)}
            >
              <Icon name="chart-bar" size={18} color="#8B5CF6" />
              <Text style={[styles.actionText, { color: '#8B5CF6' }]}>Stats</Text>
            </Pressable>

            {!trend.user_has_predicted && (
              <GradientButton
                onPress={() => Alert.alert('Coming Soon', 'Peak prediction feature coming soon!')}
                style={styles.predictButton}
              >
                <Icon name="target" size={18} color="#FFFFFF" />
                <Text style={styles.predictText}>Predict Peak</Text>
              </GradientButton>
            )}
          </View>
        </GlassCard>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading trends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0F0F0F', '#1A1A1A']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trend Predictions</Text>
        <Text style={styles.headerSubtitle}>Vote on trending potential</Text>
      </View>

      {/* Trends List */}
      <FlatList
        data={trends}
        renderItem={renderTrendCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTrends();
            }}
            tintColor="#8B5CF6"
          />
        }
      />

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCommentModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowCommentModal(false)}
        >
          <Animated.View 
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.commentModal}
          >
            <Pressable>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Comments</Text>
                <Pressable onPress={() => setShowCommentModal(false)}>
                  <Icon name="close" size={24} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.commentInput}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  multiline
                />
                <Pressable onPress={handleComment} style={styles.sendButton}>
                  <Icon name="send" size={20} color="#FFFFFF" />
                </Pressable>
              </View>

              <ScrollView style={styles.commentsList}>
                {comments.map(comment => (
                  <View key={comment.id} style={styles.commentItem}>
                    <Text style={styles.commentUsername}>{comment.username}</Text>
                    <Text style={styles.commentText}>{comment.comment}</Text>
                    <Text style={styles.commentTime}>{comment.created_at}</Text>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Stats Modal */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStatsModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowStatsModal(false)}
        >
          <Animated.View 
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.statsModal}
          >
            <Pressable>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Trend Activity</Text>
                <Pressable onPress={() => setShowStatsModal(false)}>
                  <Icon name="close" size={24} color="#64748B" />
                </Pressable>
              </View>

              {selectedTrendStats && (
                <>
                  <Text style={styles.statsTrendTitle}>{selectedTrendStats.title}</Text>
                  
                  {/* Vote Breakdown */}
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statEmoji}>🌊</Text>
                      <Text style={styles.statValue}>{selectedTrendStats.wave_votes}</Text>
                      <Text style={styles.statLabel}>Wave</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statEmoji}>🔥</Text>
                      <Text style={styles.statValue}>{selectedTrendStats.fire_votes}</Text>
                      <Text style={styles.statLabel}>Fire</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statEmoji}>📉</Text>
                      <Text style={styles.statValue}>{selectedTrendStats.declining_votes}</Text>
                      <Text style={styles.statLabel}>Declining</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statEmoji}>💀</Text>
                      <Text style={styles.statValue}>{selectedTrendStats.dead_votes}</Text>
                      <Text style={styles.statLabel}>Dead</Text>
                    </View>
                  </View>

                  {/* Activity Feed */}
                  <ScrollView style={styles.activityFeed}>
                    <Text style={styles.activityTitle}>Recent Activity</Text>
                    
                    {selectedTrendStats.activityVotes?.map((vote: any) => (
                      <View key={vote.id} style={styles.activityItem}>
                        <Text style={styles.activityText}>
                          <Text style={styles.activityUsername}>
                            {vote.profiles?.username || 'Anonymous'}
                          </Text>
                          {' voted '}
                          {vote.vote_type === 'wave' && '🌊'}
                          {vote.vote_type === 'fire' && '🔥'}
                          {vote.vote_type === 'declining' && '📉'}
                          {vote.vote_type === 'dead' && '💀'}
                        </Text>
                        <Text style={styles.activityTime}>
                          {new Date(vote.created_at).toLocaleString()}
                        </Text>
                      </View>
                    ))}

                    {selectedTrendStats.activityComments?.map((comment: any) => (
                      <View key={comment.id} style={styles.activityItem}>
                        <Text style={styles.activityText}>
                          <Text style={styles.activityUsername}>
                            {comment.profiles?.username || 'Anonymous'}
                          </Text>
                          {' commented'}
                        </Text>
                        <Text style={styles.activityComment}>"{comment.comment}"</Text>
                        <Text style={styles.activityTime}>
                          {new Date(comment.created_at).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  trendCard: {
    padding: 16,
    marginBottom: 16,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  platformBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  platformText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  trendDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 20,
  },
  heatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heatText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  voteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  voteButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  voteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  voteIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  predictText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentModal: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  statsModal: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  commentsList: {
    maxHeight: 300,
  },
  commentItem: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 10,
    color: '#64748B',
  },
  statsTrendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    minWidth: 70,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  activityFeed: {
    maxHeight: 300,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  activityItem: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    marginBottom: 8,
  },
  activityText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  activityUsername: {
    fontWeight: '600',
    color: '#E5E7EB',
  },
  activityComment: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  activityTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
});

export default PredictionsScreen;