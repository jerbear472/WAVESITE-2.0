import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeIn,
  SlideInRight,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedText } from '../ui/AnimatedText';
import { enhancedTheme } from '../../styles/theme.enhanced';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  icon: string;
  color: string;
  category?: string;
  expiresAt: Date;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

const WEEKLY_CHALLENGES: Omit<Challenge, 'id' | 'current' | 'expiresAt'>[] = [
  {
    title: 'Fashion Forward',
    description: 'Log 3 fashion trends',
    target: 3,
    reward: 1.00,
    icon: 'tshirt-crew',
    color: '#FF6B6B',
    category: 'fashion',
  },
  {
    title: 'Trend Verifier',
    description: 'Verify 20 trends',
    target: 20,
    reward: 0.50,
    icon: 'check-all',
    color: '#4ECDC4',
  },
  {
    title: 'Daily Scroller',
    description: 'Complete 5 sessions',
    target: 5,
    reward: 2.00,
    icon: 'timer',
    color: '#95E1D3',
  },
  {
    title: 'Meme Master',
    description: 'Log 5 meme trends',
    target: 5,
    reward: 0.75,
    icon: 'emoticon-happy',
    color: '#FFD93D',
    category: 'meme',
  },
];

export const StreaksAndChallenges: React.FC = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString(),
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const fireAnimation = useSharedValue(1);
  const celebrationScale = useSharedValue(0);

  // Fetch streak data
  const fetchStreakData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Check if streak is still active
        const lastActive = new Date(data.last_active_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastActive.setHours(0, 0, 0, 0);
        
        const daysSinceActive = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceActive > 1) {
          // Streak broken
          await supabase
            .from('user_streaks')
            .update({ current_streak: 0 })
            .eq('user_id', user?.id);
          
          setStreakData({
            currentStreak: 0,
            longestStreak: data.longest_streak,
            lastActiveDate: data.last_active_date,
          });
        } else {
          setStreakData({
            currentStreak: data.current_streak,
            longestStreak: data.longest_streak,
            lastActiveDate: data.last_active_date,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  }, [user]);

  // Fetch challenges progress
  const fetchChallenges = useCallback(async () => {
    try {
      // Get start of week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      // Fetch logged trends for fashion/meme challenges
      const { data: trendsData } = await supabase
        .from('logged_trends')
        .select('category')
        .eq('user_id', user?.id)
        .gte('timestamp', startOfWeek.toISOString())
        .lt('timestamp', endOfWeek.toISOString());

      // Fetch verifications
      const { data: verificationsData } = await supabase
        .from('trend_verifications')
        .select('id')
        .eq('user_id', user?.id)
        .gte('timestamp', startOfWeek.toISOString())
        .lt('timestamp', endOfWeek.toISOString());

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('scroll_sessions')
        .select('id')
        .eq('user_id', user?.id)
        .gte('start_time', startOfWeek.toISOString())
        .lt('start_time', endOfWeek.toISOString());

      // Calculate progress
      const fashionCount = trendsData?.filter(t => t.category === 'fashion').length || 0;
      const memeCount = trendsData?.filter(t => t.category === 'meme').length || 0;
      const verificationCount = verificationsData?.length || 0;
      const sessionCount = sessionsData?.length || 0;

      // Create challenges with progress
      const weekChallenges = WEEKLY_CHALLENGES.map((challenge, index) => {
        let current = 0;
        
        if (challenge.title === 'Fashion Forward') current = fashionCount;
        else if (challenge.title === 'Meme Master') current = memeCount;
        else if (challenge.title === 'Trend Verifier') current = verificationCount;
        else if (challenge.title === 'Daily Scroller') current = sessionCount;

        return {
          ...challenge,
          id: `challenge_${index}`,
          current,
          expiresAt: endOfWeek,
        };
      });

      setChallenges(weekChallenges);

      // Check for completed challenges
      weekChallenges.forEach(async (challenge) => {
        if (challenge.current >= challenge.target) {
          // Award bonus
          const { data: existing } = await supabase
            .from('challenge_completions')
            .select('id')
            .eq('user_id', user?.id)
            .eq('challenge_id', challenge.id)
            .eq('week_start', startOfWeek.toISOString())
            .single();

          if (!existing) {
            await supabase
              .from('challenge_completions')
              .insert({
                user_id: user?.id,
                challenge_id: challenge.id,
                week_start: startOfWeek.toISOString(),
                reward: challenge.reward,
                completed_at: new Date().toISOString(),
              });

            // Trigger celebration animation
            celebrationScale.value = withSequence(
              withSpring(1.2),
              withSpring(0.8),
              withSpring(1)
            );
          }
        }
      });

    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  }, [user, celebrationScale]);

  useEffect(() => {
    fetchStreakData();
    fetchChallenges();

    // Animate fire for streak
    fireAnimation.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 20 }),
        withSpring(0.9, { damping: 20 })
      ),
      -1,
      true
    );
  }, [fetchStreakData, fetchChallenges, fireAnimation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStreakData(), fetchChallenges()]);
    setRefreshing(false);
  }, [fetchStreakData, fetchChallenges]);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireAnimation.value }],
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
  }));

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Streak Section */}
      <Animated.View entering={FadeIn}>
        <LinearGradient
          colors={['#ff9500', '#ff3b30']}
          style={styles.streakCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.streakHeader}>
            <Animated.View style={fireStyle}>
              <Icon name="fire" size={48} color="#FFFFFF" />
            </Animated.View>
            <View style={styles.streakInfo}>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <AnimatedText style={styles.streakValue}>
                {`${streakData.currentStreak} days`}
              </AnimatedText>
            </View>
          </View>
          
          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <Icon name="trophy" size={20} color="#FFFFFF80" />
              <Text style={styles.streakStatText}>
                Best: {streakData.longestStreak} days
              </Text>
            </View>
            {streakData.currentStreak >= 7 && (
              <View style={styles.streakBadge}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.streakBadgeText}>Week Warrior!</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Challenges Section */}
      <View style={styles.challengesSection}>
        <Text style={styles.sectionTitle}>Weekly Challenges</Text>
        
        {challenges.map((challenge, index) => {
          const progress = (challenge.current / challenge.target) * 100;
          const isCompleted = challenge.current >= challenge.target;
          
          return (
            <Animated.View
              key={challenge.id}
              entering={SlideInRight.delay(index * 100)}
              style={celebrationStyle}
            >
              <GlassCard style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View
                    style={[
                      styles.challengeIcon,
                      { backgroundColor: challenge.color + '20' },
                    ]}
                  >
                    <Icon
                      name={challenge.icon}
                      size={24}
                      color={challenge.color}
                    />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>
                      {challenge.description}
                    </Text>
                  </View>
                  <View style={styles.challengeReward}>
                    <Icon
                      name={isCompleted ? 'check-circle' : 'cash'}
                      size={16}
                      color={isCompleted ? enhancedTheme.colors.success : enhancedTheme.colors.warning}
                    />
                    <Text
                      style={[
                        styles.rewardText,
                        isCompleted && styles.rewardTextCompleted,
                      ]}
                    >
                      ${challenge.reward.toFixed(2)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: isCompleted
                            ? enhancedTheme.colors.success
                            : challenge.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {challenge.current}/{challenge.target}
                  </Text>
                </View>
                
                {!isCompleted && (
                  <Text style={styles.expiresText}>
                    Expires in {getTimeRemaining(challenge.expiresAt)}
                  </Text>
                )}
              </GlassCard>
            </Animated.View>
          );
        })}
      </View>

      {/* Tips */}
      <Animated.View entering={FadeIn.delay(500)}>
        <GlassCard style={styles.tipsCard}>
          <Icon name="lightbulb" size={24} color={enhancedTheme.colors.warning} />
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <Text style={styles.tipsText}>
            • Complete at least one session daily to maintain your streak
          </Text>
          <Text style={styles.tipsText}>
            • Verify trends during downtime for easy bonus earnings
          </Text>
          <Text style={styles.tipsText}>
            • Focus on one challenge at a time for faster completion
          </Text>
        </GlassCard>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  streakCard: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakInfo: {
    marginLeft: 16,
    flex: 1,
  },
  streakLabel: {
    fontSize: 16,
    color: '#FFFFFF80',
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakStatText: {
    fontSize: 14,
    color: '#FFFFFF80',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  challengesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  challengeCard: {
    padding: 20,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
  },
  challengeDescription: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 2,
  },
  challengeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '600',
    color: enhancedTheme.colors.warning,
  },
  rewardTextCompleted: {
    color: enhancedTheme.colors.success,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: enhancedTheme.colors.text,
  },
  expiresText: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 8,
  },
  tipsCard: {
    margin: 20,
    padding: 20,
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
});