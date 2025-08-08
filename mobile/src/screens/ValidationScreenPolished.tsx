import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  useAnimatedGestureHandler,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import HapticFeedback from 'react-native-haptic-feedback';
import supabaseService from '../services/supabaseService';
import { TrendSubmission } from '../types/database';
import { BlurView } from '@react-native-community/blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface TrendCardProps {
  trend: TrendSubmission;
  onValidate: (confirmed: boolean, notes?: string) => void;
  isActive: boolean;
}

const TrendCard: React.FC<TrendCardProps> = ({ trend, onValidate, isActive }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1);
    } else {
      scale.value = withSpring(0.95);
    }
  }, [isActive]);

  const handleValidation = (confirmed: boolean) => {
    HapticFeedback.trigger(confirmed ? 'notificationSuccess' : 'notificationWarning');
    if (!confirmed && !showNotes) {
      setShowNotes(true);
    } else {
      onValidate(confirmed, notes);
      setShowNotes(false);
      setNotes('');
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      scale.value = withSpring(1.02);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.2;
    },
    onEnd: () => {
      const shouldDismissRight = translateX.value > SWIPE_THRESHOLD;
      const shouldDismissLeft = translateX.value < -SWIPE_THRESHOLD;

      if (shouldDismissRight) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5);
        runOnJS(handleValidation)(true);
      } else if (shouldDismissLeft) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5);
        runOnJS(handleValidation)(false);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SCREEN_WIDTH / 4],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 4, 0],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      tech: 'laptop',
      fashion: 'tshirt-crew',
      food: 'food',
      health: 'heart-pulse',
      entertainment: 'movie',
      sports: 'basketball',
      travel: 'airplane',
      business: 'briefcase',
    };
    return icons[category] || 'trending-up';
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient
          colors={['rgba(0, 128, 255, 0.1)', 'rgba(0, 212, 255, 0.05)']}
          style={styles.cardGradient}
        >
          {/* Image Section */}
          {trend.screenshot_url && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: trend.screenshot_url }} 
                style={styles.trendImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0, 13, 26, 0.8)']}
                style={styles.imageOverlay}
              />
            </View>
          )}

          {/* Content Section */}
          <View style={styles.cardContent}>
            {/* Category Badge */}
            <View style={styles.categoryBadge}>
              <Icon name={getCategoryIcon(trend.category)} size={16} color="#ffffff" />
              <Text style={styles.categoryText}>{trend.category.toUpperCase()}</Text>
            </View>

            {/* Title and Description */}
            <Text style={styles.trendTitle}>{trend.title || 'Untitled Trend'}</Text>
            <Text style={styles.trendDescription}>{trend.description}</Text>

            {/* Metadata */}
            <View style={styles.metadataContainer}>
              <View style={styles.metadataItem}>
                <Icon name="account" size={14} color={enhancedTheme.colors.textTertiary} />
                <Text style={styles.metadataText}>
                  @{trend.spotter?.username || 'anonymous'}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Icon name="clock-outline" size={14} color={enhancedTheme.colors.textTertiary} />
                <Text style={styles.metadataText}>
                  {new Date(trend.created_at).toLocaleDateString()}
                </Text>
              </View>
              {trend.validation_count > 0 && (
                <View style={styles.metadataItem}>
                  <Icon name="check-all" size={14} color={enhancedTheme.colors.success} />
                  <Text style={styles.metadataText}>{trend.validation_count} validations</Text>
                </View>
              )}
            </View>

            {/* Wave Score */}
            {trend.wave_score && (
              <View style={styles.waveScoreContainer}>
                <Text style={styles.waveScoreLabel}>Wave Score</Text>
                <View style={styles.waveScoreBar}>
                  <LinearGradient
                    colors={enhancedTheme.colors.primaryGradient}
                    style={[styles.waveScoreFill, { width: `${trend.wave_score}%` }]}
                  />
                </View>
                <Text style={styles.waveScoreValue}>{trend.wave_score}</Text>
              </View>
            )}

            {/* Notes Input (shown when rejecting) */}
            {showNotes && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Why doesn't this qualify as a trend?</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add your feedback (optional)"
                  placeholderTextColor={enhancedTheme.colors.textTertiary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={styles.submitNotesButton}
                  onPress={() => handleValidation(false)}
                >
                  <Text style={styles.submitNotesText}>Submit Feedback</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Swipe Indicators */}
          <Animated.View style={[styles.choiceContainer, styles.likeContainer, likeOpacity]}>
            <Text style={styles.choiceText}>VALID</Text>
          </Animated.View>
          <Animated.View style={[styles.choiceContainer, styles.nopeContainer, nopeOpacity]}>
            <Text style={styles.choiceText}>INVALID</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </PanGestureHandler>
  );
};

export const ValidationScreenPolished: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendSubmission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState({
    validated: 0,
    earned: 0,
  });

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const trendsData = await supabaseService.getTrendsForValidation(user.id, 10);
      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading trends:', error);
      Alert.alert('Error', 'Failed to load trends for validation');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (confirmed: boolean, notes?: string) => {
    if (!user?.id || validating) return;
    
    const currentTrend = trends[currentIndex];
    if (!currentTrend) return;
    
    setValidating(true);
    try {
      const { error } = await supabaseService.submitValidation(
        user.id,
        currentTrend.id,
        confirmed,
        notes
      );
      
      if (error) {
        throw error;
      }
      
      // Update stats
      const earnedAmount = confirmed ? 5 : 2;
      setStats(prev => ({
        validated: prev.validated + 1,
        earned: prev.earned + earnedAmount,
      }));
      
      // Move to next trend
      if (currentIndex < trends.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // No more trends
        Alert.alert(
          'Great job!',
          `You've validated ${stats.validated + 1} trends and earned ${stats.earned + earnedAmount} Wave Points!`,
          [
            {
              text: 'Load More',
              onPress: loadTrends,
            },
            {
              text: 'Done',
              onPress: () => {},
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      Alert.alert('Error', 'Failed to submit validation');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={enhancedTheme.colors.primaryGradient}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading trends...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (trends.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#000d1a', '#001a33']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.emptyContainer}>
          <Icon name="check-all" size={64} color={enhancedTheme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Trends to Validate</Text>
          <Text style={styles.emptySubtitle}>Check back later for new trends!</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadTrends}>
            <LinearGradient
              colors={enhancedTheme.colors.primaryGradient}
              style={styles.refreshButtonGradient}
            >
              <Icon name="refresh" size={20} color="#ffffff" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#000d1a', '#001a33']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Validate Trends</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.validated}</Text>
              <Text style={styles.statLabel}>Validated</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.earned}</Text>
              <Text style={styles.statLabel}>Points Earned</Text>
            </View>
          </View>
        </View>

        {/* Cards Stack */}
        <View style={styles.cardsContainer}>
          {trends.slice(currentIndex, currentIndex + 3).reverse().map((trend, index) => (
            <View
              key={trend.id}
              style={[
                styles.cardWrapper,
                { zIndex: trends.length - index },
              ]}
              pointerEvents={index === 2 ? 'auto' : 'none'}
            >
              <TrendCard
                trend={trend}
                onValidate={handleValidate}
                isActive={index === 2}
              />
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleValidate(false)}
            disabled={validating}
          >
            <LinearGradient
              colors={['#ff3b30', '#ff6b60']}
              style={styles.actionButtonGradient}
            >
              <Icon name="close" size={28} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              if (currentIndex < trends.length - 1) {
                setCurrentIndex(currentIndex + 1);
              }
            }}
            disabled={validating}
          >
            <Icon name="skip-next" size={28} color={enhancedTheme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleValidate(true)}
            disabled={validating}
          >
            <LinearGradient
              colors={enhancedTheme.colors.primaryGradient}
              style={styles.actionButtonGradient}
            >
              <Icon name="check" size={28} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.background,
  },
  loadingGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: enhancedTheme.colors.glassBorder,
    marginHorizontal: 20,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardWrapper: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
  },
  card: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
    borderRadius: 24,
  },
  imageContainer: {
    height: '40%',
    position: 'relative',
  },
  trendImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: enhancedTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  trendTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  trendDescription: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: enhancedTheme.colors.textTertiary,
  },
  waveScoreContainer: {
    marginTop: 'auto',
  },
  waveScoreLabel: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 4,
  },
  waveScoreBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  waveScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  waveScoreValue: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 12,
    fontWeight: '600',
    color: enhancedTheme.colors.primary,
  },
  choiceContainer: {
    position: 'absolute',
    top: 40,
    padding: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeContainer: {
    right: 20,
    borderColor: enhancedTheme.colors.success,
    transform: [{ rotate: '15deg' }],
  },
  nopeContainer: {
    left: 20,
    borderColor: enhancedTheme.colors.error,
    transform: [{ rotate: '-15deg' }],
  },
  choiceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  notesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  notesLabel: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: enhancedTheme.colors.text,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitNotesButton: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: enhancedTheme.colors.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitNotesText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 20,
    gap: 24,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 32,
  },
  refreshButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});