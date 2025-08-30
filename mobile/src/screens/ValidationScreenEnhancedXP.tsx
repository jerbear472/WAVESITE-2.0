import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  runOnJS,
  useAnimatedGestureHandler,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  State,
} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useXPNotification } from '../contexts/XPNotificationContext';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedText } from '../components/ui/AnimatedText';
import ValidationService, { ValidationQueueItem } from '../services/ValidationService';
import { supabase } from '../config/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_VELOCITY_THRESHOLD = 800;

interface ExtendedValidationItem extends ValidationQueueItem {
  driving_generation?: string;
  trend_origin?: string;
  evolution_status?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
}

export const ValidationScreenEnhancedXP: React.FC = () => {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [currentTrend, setCurrentTrend] = useState<ExtendedValidationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalVotes: 0, 
    accuracy: 0, 
    streak: 0,
    todaysXP: 0,
    dailyValidations: 0 
  });
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    loadNextTrend();
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!user?.id) return;
    
    try {
      // Load validation stats
      const userStats = await ValidationService.getValidationStats(user.id);
      
      // Load today's XP
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: xpTransactions } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());
      
      const dailyXP = xpTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // Load today's validations count
      const { data: validations } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('validator_id', user.id)
        .gte('created_at', today.toISOString());

      setStats({
        ...userStats,
        todaysXP: dailyXP,
        dailyValidations: validations?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadNextTrend = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const nextTrend = await ValidationService.getNextValidationItem(user.id);
      if (nextTrend) {
        setCurrentTrend(nextTrend);
        // Reset card position
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        rotate.value = withSpring(0);
        opacity.value = withSpring(1);
      } else {
        setCurrentTrend(null);
      }
    } catch (error) {
      console.error('Error loading trend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentTrend || !user?.id) return;
    
    const isValid = direction === 'right';
    
    try {
      // Submit validation
      const { data: validationData, error: validationError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: currentTrend.trend_id,
          validator_id: user.id,
          vote: isValid ? 'wave' : 'dead',
          is_valid: isValid,
          validation_score: isValid ? 1 : -1,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (validationError && validationError.code !== '23505') {
        throw validationError;
      }

      // Calculate XP
      const baseXP = 10;
      const currentValidationCount = stats.dailyValidations;
      const streakLevel = Math.floor(currentValidationCount / 10);
      const streakMultiplier = 1.0 + (streakLevel * 0.1);
      const totalXP = Math.round(baseXP * streakMultiplier);

      // Award XP
      const { error: xpError } = await supabase
        .from('xp_transactions')
        .insert({
          user_id: user.id,
          amount: totalXP,
          type: 'validation',
          description: `Validated trend: ${currentTrend.title || 'Untitled'}`,
          reference_id: currentTrend.trend_id,
          reference_type: 'trend',
          created_at: new Date().toISOString()
        });

      if (!xpError) {
        // Show XP notification
        let message = `Validation: +${totalXP} XP`;
        if (streakMultiplier > 1.0) {
          message += ` | Streak ${streakMultiplier.toFixed(1)}x`;
        }
        showXPNotification(totalXP, message, 'validation');

        // Update local stats
        setStats(prev => ({
          ...prev,
          todaysXP: prev.todaysXP + totalXP,
          dailyValidations: prev.dailyValidations + 1,
          totalVotes: prev.totalVotes + 1,
        }));
      }

      // Check for consensus bonus
      const { data: allVotes } = await supabase
        .from('trend_validations')
        .select('is_valid')
        .eq('trend_id', currentTrend.trend_id);
      
      if (allVotes && allVotes.length >= 3) {
        const validVotes = allVotes.filter(v => v.is_valid).length;
        const majorityVotedValid = validVotes > allVotes.length / 2;
        const inConsensus = (isValid && majorityVotedValid) || (!isValid && !majorityVotedValid);
        
        if (inConsensus) {
          const consensusBonus = 5;
          await supabase
            .from('xp_transactions')
            .insert({
              user_id: user.id,
              amount: consensusBonus,
              type: 'bonus',
              description: 'Consensus bonus',
              reference_id: currentTrend.trend_id,
              reference_type: 'trend',
              created_at: new Date().toISOString()
            });
          
          setTimeout(() => {
            showXPNotification(consensusBonus, 'Consensus Bonus!', 'bonus');
          }, 500);
        }
      }

      // Load next trend
      setTimeout(() => {
        loadNextTrend();
      }, 300);
    } catch (error) {
      console.error('Error submitting validation:', error);
      Alert.alert('Error', 'Failed to submit validation');
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      scale.value = withSpring(1.05);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5;
      rotate.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-30, 0, 30],
        Extrapolate.CLAMP
      );
      opacity.value = interpolate(
        Math.abs(event.translationX),
        [0, SCREEN_WIDTH * 0.5],
        [1, 0.5],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD || 
                            event.velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD || 
                             event.velocityX > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipeLeft) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        runOnJS(handleSwipe)('left');
      } else if (shouldSwipeRight) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        runOnJS(handleSwipe)('right');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        rotate.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading && !currentTrend) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={enhancedTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading trends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentTrend) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="check-circle" size={64} color={enhancedTheme.colors.success} />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyMessage}>
            No trends need validation right now. Check back soon!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0F0F0F', '#1A1A1A']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Header Stats */}
        <View style={styles.header}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="fire" size={20} color="#FF6B6B" />
              <Text style={styles.statValue}>{stats.dailyValidations}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="lightning-bolt" size={20} color="#FFD700" />
              <Text style={styles.statValue}>{stats.todaysXP}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="trending-up" size={20} color="#4ECDC4" />
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>

        {/* Swipeable Card */}
        <View style={styles.cardContainer}>
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.card, cardAnimatedStyle]}>
              <GlassCard style={styles.trendCard}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Platform & Category */}
                  <View style={styles.trendHeader}>
                    <View style={styles.platformBadge}>
                      <Text style={styles.platformText}>{currentTrend.platform}</Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{currentTrend.category}</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.trendTitle}>{currentTrend.title}</Text>

                  {/* Description */}
                  {currentTrend.description && (
                    <Text style={styles.trendDescription}>{currentTrend.description}</Text>
                  )}

                  {/* Metadata Grid */}
                  <View style={styles.metadataGrid}>
                    {currentTrend.trend_velocity && (
                      <View style={styles.metadataItem}>
                        <Icon name="speedometer" size={16} color="#8B5CF6" />
                        <Text style={styles.metadataLabel}>Velocity</Text>
                        <Text style={styles.metadataValue}>
                          {currentTrend.trend_velocity.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    )}
                    
                    {currentTrend.trend_size && (
                      <View style={styles.metadataItem}>
                        <Icon name="resize" size={16} color="#3B82F6" />
                        <Text style={styles.metadataLabel}>Size</Text>
                        <Text style={styles.metadataValue}>
                          {currentTrend.trend_size.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    )}

                    {currentTrend.driving_generation && (
                      <View style={styles.metadataItem}>
                        <Icon name="account-group" size={16} color="#10B981" />
                        <Text style={styles.metadataLabel}>Generation</Text>
                        <Text style={styles.metadataValue}>
                          {currentTrend.driving_generation.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    )}

                    {currentTrend.trend_origin && (
                      <View style={styles.metadataItem}>
                        <Icon name="source-branch" size={16} color="#F59E0B" />
                        <Text style={styles.metadataLabel}>Origin</Text>
                        <Text style={styles.metadataValue}>
                          {currentTrend.trend_origin.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Engagement Stats */}
                  {(currentTrend.views_count || currentTrend.likes_count || currentTrend.comments_count) && (
                    <View style={styles.engagementContainer}>
                      {currentTrend.views_count !== undefined && (
                        <View style={styles.engagementItem}>
                          <Icon name="eye" size={16} color="#64748B" />
                          <Text style={styles.engagementText}>
                            {formatNumber(currentTrend.views_count)}
                          </Text>
                        </View>
                      )}
                      {currentTrend.likes_count !== undefined && (
                        <View style={styles.engagementItem}>
                          <Icon name="heart" size={16} color="#EF4444" />
                          <Text style={styles.engagementText}>
                            {formatNumber(currentTrend.likes_count)}
                          </Text>
                        </View>
                      )}
                      {currentTrend.comments_count !== undefined && (
                        <View style={styles.engagementItem}>
                          <Icon name="comment" size={16} color="#3B82F6" />
                          <Text style={styles.engagementText}>
                            {formatNumber(currentTrend.comments_count)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Validation Question */}
                  <View style={styles.questionContainer}>
                    <Text style={styles.questionText}>
                      Is this a real trend worth tracking?
                    </Text>
                    <Text style={styles.questionHint}>
                      Swipe right to approve, left to reject
                    </Text>
                  </View>
                </ScrollView>
              </GlassCard>
            </Animated.View>
          </PanGestureHandler>

          {/* Swipe Indicators */}
          <View style={styles.swipeIndicators}>
            <View style={[styles.indicator, styles.rejectIndicator]}>
              <Icon name="close" size={24} color="#EF4444" />
            </View>
            <View style={[styles.indicator, styles.approveIndicator]}>
              <Icon name="check" size={24} color="#10B981" />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleSwipe('left')}
          >
            <Icon name="close" size={28} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={styles.skipButton}
            onPress={loadNextTrend}
          >
            <Icon name="skip-next" size={24} color="#64748B" />
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleSwipe('right')}
          >
            <Icon name="check" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  header: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  trendCard: {
    padding: 20,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  platformBadge: {
    backgroundColor: enhancedTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  platformText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  trendTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  trendDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metadataItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    margin: '1%',
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  metadataValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  engagementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  questionContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  questionHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  swipeIndicators: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  indicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  rejectIndicator: {
    backgroundColor: '#EF4444',
  },
  approveIndicator: {
    backgroundColor: '#10B981',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ValidationScreenEnhancedXP;