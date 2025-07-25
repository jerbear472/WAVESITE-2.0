import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../ui/GlassCard';
import { enhancedTheme } from '../../styles/theme.enhanced';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const ROTATION_ANGLE = 30;

interface TrendItem {
  id: string;
  user_id: string;
  category: string;
  notes: string;
  emoji: string;
  timestamp: string;
  username?: string;
  verification_count?: number;
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  fashion: { icon: 'tshirt-crew', color: '#FF6B6B' },
  wellness: { icon: 'heart', color: '#4ECDC4' },
  meme: { icon: 'emoticon-happy', color: '#FFD93D' },
  audio: { icon: 'music', color: '#95E1D3' },
  tech: { icon: 'cellphone', color: '#A8E6CF' },
  food: { icon: 'food', color: '#FFB6C1' },
  lifestyle: { icon: 'home', color: '#DDA0DD' },
  other: { icon: 'dots-horizontal', color: '#B0B0B0' },
};

export const SwipeableVerificationFeed: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Fetch unverified trends
  const fetchTrends = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('logged_trends')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .neq('user_id', user?.id)
        .is('verified', null)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Submit verification vote
  const submitVote = useCallback(async (trendId: string, vote: 'confirm' | 'reject') => {
    try {
      const { error } = await supabase
        .from('trend_verifications')
        .insert({
          trend_id: trendId,
          user_id: user?.id,
          vote,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      // Award points for verification
      await supabase.rpc('award_verification_points', {
        user_id: user?.id,
        amount: 0.05, // 5 cents per verification
      });

    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  }, [user]);

  // Handle swipe completion
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    const currentTrend = trends[currentIndex];
    if (currentTrend) {
      submitVote(currentTrend.id, direction === 'right' ? 'confirm' : 'reject');
    }
    
    setCurrentIndex(prev => prev + 1);
    translateX.value = 0;
    translateY.value = 0;
  }, [currentIndex, trends, submitVote, translateX, translateY]);

  // Gesture handler
  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: () => {
      const shouldSwipeRight = translateX.value > SWIPE_THRESHOLD;
      const shouldSwipeLeft = translateX.value < -SWIPE_THRESHOLD;

      if (shouldSwipeRight) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5);
        runOnJS(handleSwipeComplete)('right');
      } else if (shouldSwipeLeft) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5);
        runOnJS(handleSwipeComplete)('left');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  // Card animation styles
  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Overlay styles
  const confirmOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  const rejectOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={enhancedTheme.colors.primary} />
      </View>
    );
  }

  if (currentIndex >= trends.length) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="check-all" size={64} color={enhancedTheme.colors.textSecondary} />
        <Text style={styles.emptyText}>All caught up!</Text>
        <Text style={styles.emptySubtext}>Check back later for more trends to verify</Text>
      </View>
    );
  }

  const currentTrend = trends[currentIndex];
  const categoryConfig = CATEGORY_CONFIG[currentTrend.category] || CATEGORY_CONFIG.other;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Trends</Text>
        <Text style={styles.subtitle}>Swipe right to confirm, left to reject</Text>
      </View>

      <View style={styles.cardContainer}>
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.card, cardStyle]}>
            <GlassCard style={styles.trendCard}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: categoryConfig.color + '20' },
                  ]}
                >
                  <Icon
                    name={categoryConfig.icon}
                    size={32}
                    color={categoryConfig.color}
                  />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>
                    {currentTrend.category.charAt(0).toUpperCase() + currentTrend.category.slice(1)}
                  </Text>
                  <Text style={styles.timestamp}>
                    {new Date(currentTrend.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              </View>

              {/* Trend Content */}
              <View style={styles.content}>
                {currentTrend.emoji && (
                  <Text style={styles.emoji}>{currentTrend.emoji}</Text>
                )}
                <Text style={styles.notes}>
                  {currentTrend.notes || 'No description provided'}
                </Text>
              </View>

              {/* User Info */}
              <View style={styles.userInfo}>
                <Icon name="account" size={16} color={enhancedTheme.colors.textSecondary} />
                <Text style={styles.username}>
                  @{currentTrend.username || 'anonymous'}
                </Text>
              </View>

              {/* Swipe Indicators */}
              <Animated.View
                style={[styles.overlay, styles.confirmOverlay, confirmOverlayStyle]}
              >
                <Icon name="check-circle" size={80} color="#4ECDC4" />
                <Text style={styles.overlayText}>CONFIRM</Text>
              </Animated.View>

              <Animated.View
                style={[styles.overlay, styles.rejectOverlay, rejectOverlayStyle]}
              >
                <Icon name="close-circle" size={80} color="#FF6B6B" />
                <Text style={styles.overlayText}>NOT A TREND</Text>
              </Animated.View>
            </GlassCard>
          </Animated.View>
        </PanGestureHandler>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Animated.View entering={FadeIn.delay(200)}>
            <LinearGradient
              colors={['#FF6B6B', '#FF5252']}
              style={styles.actionButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="close" size={32} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300)}>
            <LinearGradient
              colors={['#4ECDC4', '#3BB8B0']}
              style={styles.actionButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="check" size={32} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </View>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {trends.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / trends.length) * 100}%` },
            ]}
          />
        </View>
      </View>
    </View>
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: 500,
  },
  trendCard: {
    flex: 1,
    padding: 24,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    marginLeft: 16,
    flex: 1,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
  },
  timestamp: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  notes: {
    fontSize: 18,
    color: enhancedTheme.colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: enhancedTheme.colors.border,
  },
  username: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginLeft: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  confirmOverlay: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },
  rejectOverlay: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  overlayText: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 80,
    marginTop: 20,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  progress: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: enhancedTheme.colors.primary,
  },
});