import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import supabaseService from '../services/supabaseService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import { getLevelFromXP, formatXP } from '../config/xpConfig';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

export const ProfileScreenClean: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      if (!user?.id) return;
      const dashboardStats = await supabaseService.getDashboardStats(user.id);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };


  const statCards: StatCard[] = [
    {
      label: 'Wave Score',
      value: stats?.wave_score || 0,
      icon: '🌊',
      color: theme.colors.primary,
    },
    {
      label: 'Trends Spotted',
      value: stats?.trends_spotted || 0,
      icon: '📈',
      color: theme.colors.success,
    },
    {
      label: 'Validations',
      value: stats?.total_validations || 0,
      icon: '✓',
      color: theme.colors.secondary,
    },
    {
      label: 'Streak',
      value: `${stats?.streak_days || 0} days`,
      icon: '🔥',
      color: theme.colors.warning,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>
                {user?.username?.charAt(0).toUpperCase() || '👤'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>@{user?.username || 'user'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.rankBadge}>
                <Text style={styles.rankIcon}>⭐</Text>
                <Text style={styles.rankText}>{stats?.rank || 'Newcomer'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* XP Card */}
        <Card style={styles.xpCard} variant="elevated">
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.xpGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.xpContent}>
            <View style={styles.xpMain}>
              <Text style={styles.xpLabel}>Current Level</Text>
              <Text style={styles.levelText}>
                {getLevelFromXP(stats?.total_xp || 0).icon} Level {stats?.level || 1}
              </Text>
              <Text style={styles.levelTitle}>
                {getLevelFromXP(stats?.total_xp || 0).title}
              </Text>
              <Text style={styles.xpAmount}>
                {formatXP(stats?.total_xp || 0)} XP
              </Text>
            </View>
          </View>
          <View style={styles.xpFooter}>
            <View style={styles.xpStat}>
              <Text style={styles.xpStatLabel}>This Week</Text>
              <Text style={styles.xpStatValue}>
                {stats?.trends_this_week || 0} trends
              </Text>
            </View>
            <View style={styles.xpDivider} />
            <View style={styles.xpStat}>
              <Text style={styles.xpStatLabel}>Daily Streak</Text>
              <Text style={styles.xpStatValue}>
                {stats?.daily_streak || 0} days
              </Text>
            </View>
          </View>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <Card key={index} style={styles.statCard} variant="elevated">
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        {/* Performance Section */}
        <Card style={styles.performanceCard} variant="elevated">
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.performanceStats}>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceLabel}>Accuracy Rate</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${stats?.accuracy_rate || 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.performanceValue}>{stats?.accuracy_rate || 0}%</Text>
            </View>
            <View style={styles.performanceStat}>
              <Text style={styles.performanceLabel}>Validation Rate</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${stats?.validation_rate || 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.performanceValue}>{stats?.validation_rate || 0}%</Text>
            </View>
          </View>
        </Card>

        {/* Settings Section */}
        <Card style={styles.settingsCard} variant="elevated">
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsIcon}>🔔</Text>
            <Text style={styles.settingsText}>Notifications</Text>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsIcon}>🏆</Text>
            <Text style={styles.settingsText}>Achievements</Text>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsIcon}>🔒</Text>
            <Text style={styles.settingsText}>Privacy</Text>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsIcon}>❓</Text>
            <Text style={styles.settingsText}>Help & Support</Text>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          style={styles.signOutButton}
        />

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.wave[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.wave[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    alignSelf: 'flex-start',
    gap: 4,
  },
  rankIcon: {
    fontSize: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  xpCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  xpGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  xpContent: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  xpMain: {
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  levelText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  xpAmount: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  xpFooter: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
  },
  xpStat: {
    flex: 1,
    alignItems: 'center',
  },
  xpStatLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  xpStatValue: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: '#ffffff',
  },
  xpDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
  },
  performanceCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  performanceStats: {
    gap: theme.spacing.md,
  },
  performanceStat: {
    marginBottom: theme.spacing.sm,
  },
  performanceLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  performanceValue: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  settingsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  settingsIcon: {
    fontSize: 20,
    width: 32,
  },
  settingsText: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  settingsArrow: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  signOutButton: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  version: {
    textAlign: 'center',
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
  },
});