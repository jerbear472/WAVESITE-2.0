import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Image,
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
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { BlurView } from '@react-native-community/blur';
import supabaseService from '../services/supabaseService';
import { DashboardStats } from '../types/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string[];
  index: number;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, index, onPress }) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
      mass: 1,
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100).springify()}
      style={[styles.statCard, animatedStyle]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={color}
          style={styles.statCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statCardContent}>
            <View style={styles.statCardHeader}>
              <Icon name={icon} size={24} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statCardTitle}>{title}</Text>
            </View>
            <Text style={styles.statCardValue}>{value}</Text>
            {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface QuickActionProps {
  title: string;
  icon: string;
  onPress: () => void;
  gradient: string[];
  index: number;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, icon, onPress, gradient, index }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.quickActionContainer}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <LinearGradient
          colors={gradient}
          style={styles.quickActionButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name={icon} size={32} color="#ffffff" />
        </LinearGradient>
        <Text style={styles.quickActionText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    trends_spotted: 0,
    trends_this_week: 0,
    total_validations: 0,
    earnings_available: 0,
    earnings_total: 0,
    wave_score: 0,
    rank: 'Newcomer',
    streak_days: 0,
    accuracy_rate: 0,
    validation_rate: 0,
    recent_activity: [],
  });

  const scrollY = useSharedValue(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const dashboardStats = await supabaseService.getDashboardStats(user.id);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.8],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={enhancedTheme.colors.primaryGradient}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={enhancedTheme.colors.primary}
          />
        }
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Welcome Header */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <LinearGradient
            colors={enhancedTheme.colors.primaryGradient}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.username || 'Trend Spotter'}!</Text>
                <View style={styles.streakContainer}>
                  <Icon name="fire" size={20} color="#ffcc00" />
                  <Text style={styles.streakText}>{stats.streak_days} day streak</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.profileImageContainer}
                onPress={() => navigation.navigate('Profile')}
              >
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Icon name="account" size={30} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Wave Pattern */}
            <View style={styles.waveContainer}>
              <View style={styles.wave} />
              <View style={[styles.wave, styles.wave2]} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Trends Spotted"
            value={stats.trends_spotted}
            subtitle={`${stats.trends_this_week} this week`}
            icon="trending-up"
            color={['#0080ff', '#00d4ff']}
            index={0}
            onPress={() => navigation.navigate('MyTrends')}
          />
          <StatCard
            title="Validations"
            value={stats.total_validations}
            subtitle={`${(stats.validation_rate * 100).toFixed(0)}% accuracy`}
            icon="check-circle"
            color={['#00d4ff', '#00ffff']}
            index={1}
            onPress={() => navigation.navigate('Validate')}
          />
          <StatCard
            title="Earnings"
            value={`$${stats.earnings_available.toFixed(2)}`}
            subtitle={`$${stats.earnings_total.toFixed(2)} total`}
            icon="cash"
            color={['#4da8ff', '#0080ff']}
            index={2}
            onPress={() => navigation.navigate('Earnings')}
          />
          <StatCard
            title="Wave Score"
            value={stats.wave_score}
            subtitle={stats.rank}
            icon="medal"
            color={['#0066cc', '#0080ff']}
            index={3}
            onPress={() => navigation.navigate('Achievements')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              title="Spot Trend"
              icon="flag"
              gradient={enhancedTheme.colors.primaryGradient}
              onPress={() => navigation.navigate('Capture')}
              index={0}
            />
            <QuickAction
              title="Validate"
              icon="check-decagram"
              gradient={['#00d4ff', '#00ffff']}
              onPress={() => navigation.navigate('Validate')}
              index={1}
            />
            <QuickAction
              title="Timeline"
              icon="timeline"
              gradient={['#4da8ff', '#0080ff']}
              onPress={() => navigation.navigate('Timeline')}
              index={2}
            />
            <QuickAction
              title="Leaderboard"
              icon="trophy"
              gradient={['#0066cc', '#0080ff']}
              onPress={() => navigation.navigate('Leaderboard')}
              index={3}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <BlurView
              style={styles.blurView}
              blurType="dark"
              blurAmount={10}
              reducedTransparencyFallbackColor={enhancedTheme.colors.backgroundSecondary}
            >
              {stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <View style={styles.activityItem}>
                      <View style={styles.activityIcon}>
                        <Icon 
                          name={activity.icon || 'trending-up'} 
                          size={20} 
                          color={activity.color || enhancedTheme.colors.primary} 
                        />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                      </View>
                      <View style={styles.activityValue}>
                        {activity.type === 'earnings_received' ? (
                          <Text style={styles.activityEarnings}>{activity.value}</Text>
                        ) : (
                          <Text style={styles.activityPoints}>{activity.value}</Text>
                        )}
                      </View>
                    </View>
                    {index < stats.recent_activity.length - 1 && (
                      <View style={styles.activityDivider} />
                    )}
                  </React.Fragment>
                ))
              ) : (
                <View style={styles.emptyActivity}>
                  <Icon name="history" size={32} color={enhancedTheme.colors.textTertiary} />
                  <Text style={styles.emptyActivityText}>No recent activity</Text>
                  <Text style={styles.emptyActivitySubtext}>Start spotting trends to see your activity here!</Text>
                </View>
              )}
            </BlurView>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  scrollView: {
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
    marginBottom: 24,
  },
  headerGradient: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  streakText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    transform: [{ scaleX: 2 }],
  },
  wave2: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -10,
    height: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: -20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 36) / 2,
    margin: 6,
  },
  statCardGradient: {
    borderRadius: 20,
    padding: 20,
    minHeight: 120,
  },
  statCardContent: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  statCardValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  statCardSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionContainer: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 60) / 4,
  },
  quickActionButton: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    color: enhancedTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: enhancedTheme.colors.glass,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
  },
  blurView: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: enhancedTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: enhancedTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  activitySubtitle: {
    color: enhancedTheme.colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  activityValue: {
    alignItems: 'flex-end',
  },
  activityPoints: {
    color: enhancedTheme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  activityEarnings: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '700',
  },
  activityDivider: {
    height: 1,
    backgroundColor: enhancedTheme.colors.glassBorder,
    marginVertical: 8,
  },
  emptyActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyActivityText: {
    color: enhancedTheme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyActivitySubtext: {
    color: enhancedTheme.colors.textTertiary,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});