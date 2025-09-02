import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { enhancedTheme } from '../styles/theme.enhanced';
import { useAuth } from '../hooks/useAuth';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Trend {
  id: string;
  category: string;
  description: string;
  title: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  quality_score: number;
  validation_count: number;
  approve_count: number;
  reject_count: number;
  trend_velocity: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining' | null;
  trend_size: 'micro' | 'niche' | 'viral' | 'mega' | 'global' | null;
  predicted_peak: string;
  created_at: string;
  spotter_id: string;
  hashtags?: string[];
  creator_handle?: string;
  post_caption?: string;
  user_vote?: 'approve' | 'reject' | null;
}

export const PredictScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const votedTrends = useRef(new Set<string>()).current;

  const { data: trends, refetch, isLoading } = useQuery({
    queryKey: ['predict-trends'],
    queryFn: async () => {
      const { data: trendsData, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          trend_validations!inner(
            validator_id,
            is_valid
          )
        `)
        .neq('spotter_id', user?.id || '')
        .in('status', ['submitted', 'validating'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      // Check which trends user has already voted on
      const processedTrends = trendsData?.map(trend => {
        const userValidation = trend.trend_validations?.find(
          (v: any) => v.validator_id === user?.id
        );
        return {
          ...trend,
          user_vote: userValidation ? (userValidation.is_valid ? 'approve' : 'reject') : null,
        };
      });

      return processedTrends as Trend[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const voteMutation = useMutation({
    mutationFn: async ({ trendId, vote }: { trendId: string; vote: 'approve' | 'reject' }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trendId,
          validator_id: user.id,
          is_valid: vote === 'approve',
        });

      if (error) throw error;
      
      // Award XP for validation
      await supabase
        .from('xp_events')
        .insert({
          user_id: user.id,
          event_type: 'validation_vote',
          xp_change: 5,
          description: `Validated trend: ${vote}`,
          metadata: { trend_id: trendId, vote },
        });
    },
    onSuccess: () => {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      refetch();
    },
  });

  const handleVote = async (trendId: string, vote: 'approve' | 'reject') => {
    if (votedTrends.has(trendId)) return;
    
    votedTrends.add(trendId);
    ReactNativeHapticFeedback.trigger('impactLight');
    
    await voteMutation.mutateAsync({ trendId, vote });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderTrend = ({ item, index }: { item: Trend; index: number }) => {
    const scaleValue = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

    const hasVoted = item.user_vote !== null;
    
    return (
      <Animated.View
        entering={FadeIn.delay(index * 100)}
        style={[styles.trendCard, animatedStyle]}
      >
        {/* Image/Thumbnail */}
        {(item.screenshot_url || item.thumbnail_url) && (
          <Image
            source={{ uri: item.screenshot_url || item.thumbnail_url }}
            style={styles.trendImage}
            resizeMode="cover"
          />
        )}
        
        {/* Content Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
          style={styles.contentOverlay}
        >
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {item.category?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          {/* Title and Description */}
          <View style={styles.contentContainer}>
            {item.title && (
              <Text style={styles.trendTitle} numberOfLines={2}>
                {item.title}
              </Text>
            )}
            <Text style={styles.trendDescription} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Creator Info */}
            {item.creator_handle && (
              <Text style={styles.creatorHandle}>
                {item.creator_handle}
              </Text>
            )}

            {/* Hashtags */}
            {item.hashtags && item.hashtags.length > 0 && (
              <View style={styles.hashtagsContainer}>
                {item.hashtags.slice(0, 3).map((tag, index) => (
                  <Text key={index} style={styles.hashtag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Icon name="thumb-up" size={14} color="#fff" />
                <Text style={styles.statText}>{item.approve_count || 0}</Text>
              </View>
              <View style={styles.stat}>
                <Icon name="thumb-down" size={14} color="#fff" />
                <Text style={styles.statText}>{item.reject_count || 0}</Text>
              </View>
              <View style={styles.stat}>
                <Icon name="eye" size={14} color="#fff" />
                <Text style={styles.statText}>{item.validation_count || 0}</Text>
              </View>
            </View>
          </View>

          {/* Vote Buttons */}
          {!hasVoted ? (
            <View style={styles.voteContainer}>
              <Pressable
                style={[styles.voteButton, styles.rejectButton]}
                onPress={() => handleVote(item.id, 'reject')}
                onPressIn={() => { scaleValue.value = withSpring(0.95); }}
                onPressOut={() => { scaleValue.value = withSpring(1); }}
              >
                <Icon name="close" size={24} color="#fff" />
                <Text style={styles.voteButtonText}>PASS</Text>
              </Pressable>

              <Pressable
                style={[styles.voteButton, styles.approveButton]}
                onPress={() => handleVote(item.id, 'approve')}
                onPressIn={() => { scaleValue.value = withSpring(0.95); }}
                onPressOut={() => { scaleValue.value = withSpring(1); }}
              >
                <Icon name="check" size={24} color="#fff" />
                <Text style={styles.voteButtonText}>WAVE</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.votedContainer}>
              <View style={[
                styles.votedBadge,
                item.user_vote === 'approve' ? styles.approvedBadge : styles.rejectedBadge
              ]}>
                <Icon 
                  name={item.user_vote === 'approve' ? 'check-circle' : 'close-circle'} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.votedText}>
                  {item.user_vote === 'approve' ? 'WAVED' : 'PASSED'}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  if (isLoading && !trends) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={enhancedTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading trends...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌊 Predict The Wave</Text>
        <Text style={styles.headerSubtitle}>Swipe to validate trends</Text>
      </View>

      {/* Trends Feed */}
      <FlatList
        data={trends}
        keyExtractor={(item) => item.id}
        renderItem={renderTrend}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={enhancedTheme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="trending-up" size={64} color={enhancedTheme.colors.textTertiary} />
            <Text style={styles.emptyText}>No trends to validate</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: enhancedTheme.colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: enhancedTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 100,
  },
  trendCard: {
    width: SCREEN_WIDTH,
    height: 400,
    marginBottom: 2,
    backgroundColor: enhancedTheme.colors.surface,
    position: 'relative',
  },
  trendImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  categoryBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: enhancedTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  contentContainer: {
    marginBottom: 70,
  },
  trendTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  trendDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    lineHeight: 20,
  },
  creatorHandle: {
    fontSize: 13,
    color: enhancedTheme.colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  hashtag: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  voteContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: 'rgba(255,59,48,0.9)',
  },
  approveButton: {
    backgroundColor: 'rgba(52,199,89,0.9)',
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  votedContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  approvedBadge: {
    backgroundColor: 'rgba(52,199,89,0.9)',
  },
  rejectedBadge: {
    backgroundColor: 'rgba(255,59,48,0.9)',
  },
  votedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 8,
  },
});