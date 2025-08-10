import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import supabaseService from '../services/supabaseService';
import { Card } from '../components/ui/Card';
import { theme } from '../styles/theme';

export const TimelineScreen: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrends = async () => {
    try {
      if (!user?.id) return;
      const userTrends = await supabaseService.getUserTrends(user.id);
      setTrends(userTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrends();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'viral':
        return theme.colors.primary;
      case 'submitted':
        return theme.colors.warning;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✓';
      case 'viral':
        return '🔥';
      case 'submitted':
        return '⏳';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
          style={styles.gradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your trends...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
        style={styles.gradient}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>My Timeline</Text>
        <Text style={styles.subtitle}>Track your spotted trends</Text>
      </View>

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
        {trends.length === 0 ? (
          <Card style={styles.emptyCard} variant="elevated">
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No trends yet</Text>
            <Text style={styles.emptyText}>
              Start spotting trends to see them here!
            </Text>
          </Card>
        ) : (
          trends.map((trend) => (
            <Card key={trend.id} style={styles.trendCard} variant="elevated">
              <View style={styles.trendHeader}>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusIcon, { color: getStatusColor(trend.status) }]}>
                    {getStatusIcon(trend.status)}
                  </Text>
                  <Text style={[styles.statusText, { color: getStatusColor(trend.status) }]}>
                    {trend.status?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.trendDate}>
                  {new Date(trend.created_at).toLocaleDateString()}
                </Text>
              </View>

              {trend.screenshot_url && (
                <Image
                  source={{ uri: trend.screenshot_url }}
                  style={styles.trendImage}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.trendDescription}>{trend.description}</Text>

              <View style={styles.trendStats}>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>🌊</Text>
                  <Text style={styles.statValue}>{trend.wave_score || 0}</Text>
                  <Text style={styles.statLabel}>Wave Score</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>✓</Text>
                  <Text style={styles.statValue}>{trend.validation_count || 0}</Text>
                  <Text style={styles.statLabel}>Validations</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>💰</Text>
                  <Text style={styles.statValue}>${trend.reward_amount || 0}</Text>
                  <Text style={styles.statLabel}>Earned</Text>
                </View>
              </View>

              {trend.validations && trend.validations.length > 0 && (
                <View style={styles.validationSection}>
                  <Text style={styles.validationTitle}>Recent Validations</Text>
                  {trend.validations.slice(0, 3).map((validation: any, index: number) => (
                    <View key={index} style={styles.validationItem}>
                      <Text style={styles.validationIcon}>
                        {validation.confirmed ? '👍' : '👎'}
                      </Text>
                      <Text style={styles.validationText}>
                        {validation.validator?.username || 'Anonymous'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))
        )}
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
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  emptyCard: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  trendCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusIcon: {
    fontSize: 16,
  },
  statusText: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  trendDate: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
  },
  trendImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  trendDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  stat: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
  },
  validationSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  validationTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  validationIcon: {
    fontSize: 16,
  },
  validationText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
  },
});