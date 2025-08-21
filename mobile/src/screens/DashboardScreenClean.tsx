import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Logo } from '../components/Logo';
import { Card } from '../components/ui/Card';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { XP_CONFIG, getLevelFromXP, formatXP } from '../config/xpConfig';

interface DashboardData {
  totalXP: number;
  currentLevel: number;
  levelProgress: number;
  trendsSpotted: number;
  validationsCompleted: number;
  currentStreak: number;
  recentActivity: Array<{
    id: string;
    title: string;
    description: string;
    time: string;
    xpGained?: number;
    status?: string;
    type: 'trend' | 'validation' | 'achievement' | 'streak';
  }>;
}

export const DashboardScreenClean: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalXP: 0,
    currentLevel: 1,
    levelProgress: 0,
    trendsSpotted: 0,
    validationsCompleted: 0,
    currentStreak: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      // Get user XP data
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp, level, wave_score, daily_streak')
        .eq('id', user.id)
        .single();

      // Get trends count
      const { count: trendsCount } = await supabase
        .from('trend_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('spotter_id', user.id);

      // Get validations count
      const { count: validationsCount } = await supabase
        .from('trend_validations')
        .select('*', { count: 'exact', head: true })
        .eq('validator_id', user.id);

      // Get recent XP transactions
      const { data: recentXP } = await supabase
        .from('xp_transactions')
        .select('id, amount, source_type, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Format recent activity from XP transactions
      const activity = [];
      
      recentXP?.forEach(xp => {
        const timeAgo = getTimeAgo(new Date(xp.created_at));
        let title = 'XP Gained';
        let type: 'trend' | 'validation' | 'achievement' | 'streak' = 'trend';
        
        switch (xp.source_type) {
          case 'trend_submission':
            title = 'Trend Spotted';
            type = 'trend';
            break;
          case 'validation_vote':
            title = 'Validation Completed';
            type = 'validation';
            break;
          case 'streak_bonus':
            title = 'Streak Bonus';
            type = 'streak';
            break;
          case 'achievement':
            title = 'Achievement Unlocked';
            type = 'achievement';
            break;
          default:
            title = 'XP Gained';
        }
        
        activity.push({
          id: xp.id,
          title,
          description: xp.description || 'Experience gained',
          time: timeAgo,
          xpGained: xp.amount,
          type,
        });
      });

      // Sort activity by time and take most recent
      activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      // Calculate level progress
      const currentXP = profile?.total_xp || 0;
      const currentLevel = profile?.level || 1;
      const nextLevel = XP_CONFIG.LEVELS.find(l => l.level === currentLevel + 1);
      const currentLevelData = XP_CONFIG.LEVELS.find(l => l.level === currentLevel);
      const nextLevelXP = nextLevel?.requiredXP || currentXP;
      const currentLevelXP = currentLevelData?.requiredXP || 0;
      const progress = nextLevelXP > currentLevelXP 
        ? ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 
        : 100;

      setDashboardData({
        totalXP: currentXP,
        currentLevel,
        levelProgress: Math.min(progress, 100),
        trendsSpotted: trendsCount || 0,
        validationsCompleted: validationsCount || 0,
        currentStreak: profile?.daily_streak || 0,
        recentActivity: activity.slice(0, 5),
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return 'Just now';
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData().finally(() => setRefreshing(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Logo size="small" showText={true} />
        <TouchableOpacity style={styles.profileButton}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {user?.email?.[0].toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitle}>Here's what's trending today</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {/* Level & XP Card */}
          <Card style={[styles.statCard, styles.levelCard]} variant="elevated">
            <View style={styles.levelHeader}>
              <Text style={styles.levelNumber}>LVL {dashboardData.currentLevel}</Text>
              <Text style={styles.xpValue}>{formatXP(dashboardData.totalXP)} XP</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${dashboardData.levelProgress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{Math.round(dashboardData.levelProgress)}%</Text>
            </View>
          </Card>

          <Card style={styles.statCard} variant="elevated">
            <Text style={styles.statValue}>{dashboardData.trendsSpotted}</Text>
            <Text style={styles.statLabel}>Trends Spotted</Text>
            <Text style={styles.statIcon}>🔍</Text>
          </Card>

          <Card style={styles.statCard} variant="elevated">
            <Text style={styles.statValue}>{dashboardData.validationsCompleted}</Text>
            <Text style={styles.statLabel}>Validations</Text>
            <Text style={styles.statIcon}>✅</Text>
          </Card>

          <Card style={styles.statCard} variant="elevated">
            <Text style={styles.statValue}>{dashboardData.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
            <Text style={styles.statIcon}>🔥</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              icon="📱"
              title="Capture Trend"
              description="Record trending content"
              onPress={() => navigation.navigate('Capture' as never)}
            />
            <ActionCard
              icon="✅"
              title="Validate"
              description="Review and verify trends"
              onPress={() => navigation.navigate('Validation' as never)}
            />
            <ActionCard
              icon="📊"
              title="My Timeline"
              description="View your submissions"
              onPress={() => navigation.navigate('MyTimeline' as never)}
            />
            <ActionCard
              icon="🏆"
              title="Leaderboard"
              description="See top performers"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Card variant="outlined">
            {dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ActivityItem
                    title={activity.title}
                    description={activity.description}
                    time={activity.time}
                    xpGained={activity.xpGained}
                    type={activity.type}
                  />
                  {index < dashboardData.recentActivity.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyText}>No recent activity</Text>
                <Text style={styles.emptySubtext}>Start capturing trends to see your activity here</Text>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Capture' as never)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const ActionCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}> = ({ icon, title, description, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Card style={styles.actionCard}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </Card>
  </TouchableOpacity>
);

const ActivityItem: React.FC<{
  title: string;
  description: string;
  time: string;
  xpGained?: number;
  type: 'trend' | 'validation' | 'achievement' | 'streak';
}> = ({ title, description, time, xpGained, type }) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'trend': return '🔍';
      case 'validation': return '✅';
      case 'achievement': return '🏆';
      case 'streak': return '🔥';
      default: return '⭐';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'trend': return theme.colors.primary;
      case 'validation': return theme.colors.success;
      case 'achievement': return theme.colors.warning;
      case 'streak': return '#ff6b35';
      default: return theme.colors.textLight;
    }
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Text style={styles.activityEmoji}>{getTypeIcon()}</Text>
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityDescription}>{description}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
      {xpGained && (
        <View style={[styles.xpBadge, { backgroundColor: getTypeColor() }]}>
          <Text style={styles.xpText}>+{xpGained} XP</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...theme.shadows.sm,
  },
  profileButton: {
    padding: theme.spacing.xs,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl * 2,
  },
  welcomeSection: {
    paddingVertical: theme.spacing.xl,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '300',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionCard: {
    width: (360 - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  actionDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  activityDescription: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  activityTime: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
  },
  activityEarnings: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.success,
  },
  pendingBadge: {
    backgroundColor: theme.colors.wave[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  pendingText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: -theme.spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
  },
  emptyActivity: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});