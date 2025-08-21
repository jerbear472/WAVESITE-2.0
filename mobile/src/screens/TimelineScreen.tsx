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

interface UserTrend {
  id: string;
  created_at: string;
  description: string;
  title?: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  category?: string;
  creator_handle?: string;
  platform?: string;
  status?: string;
  trend_velocity?: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining';
  trend_size?: 'micro' | 'niche' | 'viral' | 'mega' | 'global';
  ai_angle?: 'using_ai' | 'reacting_to_ai' | 'ai_tool_viral' | 'ai_technique' | 'anti_ai' | 'not_ai';
  predicted_peak?: string;
  approve_count?: number;
  reject_count?: number;
  validation_count?: number;
  hashtags?: string[];
  validations?: any[];
  base_amount?: number;
  reward_amount?: number;
}

export const TimelineScreen: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<UserTrend[]>([]);
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

              {/* Title */}
              {trend.title && (
                <Text style={styles.trendTitle}>
                  {trend.title}
                </Text>
              )}

              <Text style={styles.trendDescription}>{trend.description}</Text>

              {/* User-tagged Trend Metadata */}
              {(trend.trend_velocity || trend.trend_size || trend.ai_angle) && (
                <View style={styles.trendMetadataSection}>
                  <Text style={styles.metadataTitle}>Trend Characteristics</Text>
                  <View style={styles.metadataGrid}>
                    {trend.trend_velocity && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Velocity:</Text>
                        <Text style={styles.metadataValue}>{trend.trend_velocity.replace('_', ' ')}</Text>
                      </View>
                    )}
                    {trend.trend_size && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Size:</Text>
                        <Text style={styles.metadataValue}>{trend.trend_size}</Text>
                      </View>
                    )}
                    {trend.ai_angle && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>AI Angle:</Text>
                        <Text style={styles.metadataValue}>{trend.ai_angle.replace(/_/g, ' ')}</Text>
                      </View>
                    )}
                    {trend.predicted_peak && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Predicted Peak:</Text>
                        <Text style={styles.metadataValue}>{trend.predicted_peak}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {trend.creator_handle && (
                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorLabel}>Creator:</Text>
                  <Text style={styles.creatorHandle}>@{trend.creator_handle}</Text>
                </View>
              )}

              {trend.platform && (
                <View style={styles.platformBadge}>
                  <Text style={styles.platformText}>{trend.platform}</Text>
                </View>
              )}

              {/* Community Validation */}
              <View style={styles.trendStats}>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>👍</Text>
                  <Text style={styles.statValue}>{trend.approve_count || 0}</Text>
                  <Text style={styles.statLabel}>Approvals</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>👎</Text>
                  <Text style={styles.statValue}>{trend.reject_count || 0}</Text>
                  <Text style={styles.statLabel}>Rejections</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>💰</Text>
                  <Text style={styles.statValue}>${trend.base_amount || trend.reward_amount || 0}</Text>
                  <Text style={styles.statLabel}>Earned</Text>
                </View>
              </View>

              {trend.hashtags && trend.hashtags.length > 0 && (
                <View style={styles.hashtagsContainer}>
                  {trend.hashtags.slice(0, 3).map((tag: string, index: number) => (
                    <View key={index} style={styles.hashtagBadge}>
                      <Text style={styles.hashtagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

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
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  creatorLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.xs,
  },
  creatorHandle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  platformBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  platformText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  hashtagBadge: {
    backgroundColor: theme.colors.wave[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.xs,
  },
  hashtagText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.wave[600],
    fontWeight: '500',
  },
  trendTitle: {
    fontSize: theme.typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  trendMetadataSection: {
    backgroundColor: theme.colors.wave[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  metadataTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  metadataGrid: {
    gap: theme.spacing.sm,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  metadataLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});