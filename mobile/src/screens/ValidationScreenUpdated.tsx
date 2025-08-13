import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import supabaseService from '../services/supabaseService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';

interface TrendToValidate {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  platform?: string;
  creator_handle?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  validation_count: number;
  spotter_id: string;
  hours_since_post?: number;
  source_url?: string;
  hashtags?: string[];
  post_url?: string;
  status?: string;
  approve_count?: number;
  reject_count?: number;
}

interface QualityCriteria {
  id: string;
  label: string;
  description: string;
  met: boolean;
}

export const ValidationScreenUpdated: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendToValidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState({
    validated_today: 0,
    earnings_today: 0,
    validated_total: 0,
    earnings_total: 0
  });
  const [sessionValidations, setSessionValidations] = useState(0);

  const formatCount = (count?: number): string => {
    if (!count || count === 0) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const evaluateQualityCriteria = (trend: TrendToValidate): QualityCriteria[] => {
    return [
      {
        id: 'has_image',
        label: 'Visual Evidence',
        description: 'Screenshot or image provided',
        met: !!(trend.screenshot_url || trend.thumbnail_url)
      },
      {
        id: 'has_description',
        label: 'Clear Description',
        description: 'Well-described trend',
        met: !!(trend.description && trend.description.length > 10)
      },
      {
        id: 'proper_category',
        label: 'Categorized',
        description: 'Proper category assigned',
        met: !!(trend.category && trend.category !== 'other')
      },
      {
        id: 'recent',
        label: 'Timely',
        description: 'Posted within 48 hours',
        met: trend.hours_since_post ? trend.hours_since_post <= 48 : true
      },
      {
        id: 'has_engagement',
        label: 'Engagement',
        description: 'Shows social proof',
        met: (trend.likes_count || 0) > 0 || (trend.views_count || 0) > 0
      }
    ];
  };

  const calculateQualityScore = (criteria: QualityCriteria[]): number => {
    const metCount = criteria.filter(c => c.met).length;
    return Math.round((metCount / criteria.length) * 100);
  };

  const loadTrends = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const trendsData = await supabaseService.getTrendsForValidation(user.id, 20);
      
      const processedTrends = trendsData.map(trend => {
        const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
        return {
          ...trend,
          hours_since_post: hoursAgo
        };
      });

      setTrends(processedTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = useCallback(async () => {
    try {
      if (!user?.id) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // For now, we'll use simplified stats since the RPC functions might not exist
      setStats({
        validated_today: sessionValidations,
        earnings_today: sessionValidations * 0.02,  // $0.02 per validation (sustainable)
        validated_total: sessionValidations,
        earnings_total: sessionValidations * 0.02
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user, sessionValidations]);

  const handleValidation = async (decision: 'approve' | 'reject' | 'skip') => {
    if (!trends[currentIndex]) return;

    const currentTrend = trends[currentIndex];

    if (decision === 'skip') {
      nextTrend();
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to validate trends');
      return;
    }

    setValidating(true);
    
    try {
      const { data, error } = await supabaseService.submitValidation(
        user.id,
        currentTrend.id,
        decision === 'approve',
        ''
      );

      if (error) {
        Alert.alert('Error', 'Failed to submit validation');
        return;
      }

      setSessionValidations(prev => prev + 1);
      
      // Remove validated trend from list
      setTrends(prev => prev.filter(t => t.id !== currentTrend.id));
      
      // Don't increment index since we removed an item
      if (currentIndex >= trends.length - 1) {
        setCurrentIndex(Math.max(0, trends.length - 2));
      }

      Alert.alert(
        'Validation Submitted!',
        `You earned $0.02 for validating this trend!`,
        [{ text: 'Continue' }]
      );
      
    } catch (error: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const nextTrend = () => {
    if (currentIndex < trends.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    if (user) {
      loadTrends();
      loadStats();
    }
  }, [user, loadStats]);

  const currentTrend = trends[currentIndex];
  const qualityCriteria = currentTrend ? evaluateQualityCriteria(currentTrend) : [];
  const qualityScore = currentTrend ? calculateQualityScore(qualityCriteria) : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
          style={styles.gradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading trends to validate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
          style={styles.gradient}
        />
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>Please sign in to validate trends and earn rewards</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentTrend) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
          style={styles.gradient}
        />
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>All Done!</Text>
          <Text style={styles.emptyText}>
            You've validated all available trends. Great work!
          </Text>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Today's Earnings</Text>
            <Text style={styles.statsValue}>${stats.earnings_today.toFixed(2)}</Text>
            <Text style={styles.statsSubtext}>{stats.validated_today} trends validated</Text>
          </View>
          <Button
            title="Refresh"
            onPress={loadTrends}
            style={styles.refreshButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
        style={styles.gradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Validate Trends</Text>
          <Text style={styles.subtitle}>Review and verify trending content</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.progressText}>
            {currentIndex + 1} of {trends.length}
          </Text>
          <View style={styles.earningsBadge}>
            <Text style={styles.earningsText}>+${(sessionValidations * 0.02).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Main Content Card */}
        <Card style={styles.mainCard} variant="elevated">
          {/* Image Section */}
          {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentTrend.thumbnail_url || currentTrend.screenshot_url }}
                style={styles.trendImage}
                resizeMode="contain"
              />
              
              {/* Engagement Overlay */}
              {(currentTrend.likes_count || currentTrend.views_count || currentTrend.comments_count || currentTrend.shares_count) && (
                <View style={styles.engagementOverlay}>
                  {currentTrend.views_count && (
                    <View style={styles.engagementItem}>
                      <Text style={styles.engagementIcon}>👁</Text>
                      <Text style={styles.engagementText}>{formatCount(currentTrend.views_count)}</Text>
                    </View>
                  )}
                  {currentTrend.likes_count && (
                    <View style={styles.engagementItem}>
                      <Text style={styles.engagementIcon}>❤️</Text>
                      <Text style={styles.engagementText}>{formatCount(currentTrend.likes_count)}</Text>
                    </View>
                  )}
                  {currentTrend.comments_count && (
                    <View style={styles.engagementItem}>
                      <Text style={styles.engagementIcon}>💬</Text>
                      <Text style={styles.engagementText}>{formatCount(currentTrend.comments_count)}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageIcon}>📷</Text>
              <Text style={styles.noImageText}>No image provided</Text>
            </View>
          )}

          {/* Content Section */}
          <View style={styles.contentSection}>
            <Text style={styles.trendDescription}>
              {currentTrend.description || 'No description provided'}
            </Text>

            {currentTrend.post_caption && (
              <Text style={styles.postCaption}>{currentTrend.post_caption}</Text>
            )}

            {/* Metadata Tags */}
            <View style={styles.tagsContainer}>
              {currentTrend.platform && (
                <View style={[styles.tag, { backgroundColor: theme.colors.wave[100] }]}>
                  <Text style={styles.tagText}>{currentTrend.platform}</Text>
                </View>
              )}
              {currentTrend.category && (
                <View style={[styles.tag, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.tagText, { color: '#fff' }]}>
                    {currentTrend.category.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
              {currentTrend.creator_handle && (
                <View style={[styles.tag, { backgroundColor: theme.colors.secondary }]}>
                  <Text style={[styles.tagText, { color: '#fff' }]}>
                    @{currentTrend.creator_handle}
                  </Text>
                </View>
              )}
              {currentTrend.hours_since_post && (
                <View style={[styles.tag, { backgroundColor: theme.colors.warning }]}>
                  <Text style={[styles.tagText, { color: '#fff' }]}>
                    {currentTrend.hours_since_post}h ago
                  </Text>
                </View>
              )}
            </View>

            {/* Quality Assessment */}
            <View style={styles.qualitySection}>
              <View style={styles.qualityHeader}>
                <Text style={styles.qualityTitle}>Quality Assessment</Text>
                <Text style={[
                  styles.qualityScore,
                  { color: qualityScore >= 80 ? theme.colors.success : qualityScore >= 60 ? theme.colors.warning : theme.colors.error }
                ]}>
                  {qualityScore}%
                </Text>
              </View>
              
              <View style={styles.criteriaGrid}>
                {qualityCriteria.map(criterion => (
                  <View key={criterion.id} style={styles.criteriaItem}>
                    <Text style={styles.criteriaIcon}>
                      {criterion.met ? '✅' : '⚪'}
                    </Text>
                    <Text style={[
                      styles.criteriaText,
                      { color: criterion.met ? theme.colors.text : theme.colors.textMuted }
                    ]}>
                      {criterion.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Validation Progress */}
            {((currentTrend.approve_count || 0) > 0 || (currentTrend.reject_count || 0) > 0) && (
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Validation Progress</Text>
                <View style={styles.progressStats}>
                  <Text style={styles.progressText}>
                    👍 {currentTrend.approve_count || 0}/2 approvals
                  </Text>
                  <Text style={styles.progressText}>
                    👎 {currentTrend.reject_count || 0}/2 rejections
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionPrompt}>Is this a legitimate trending topic?</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleValidation('reject')}
              disabled={validating}
            >
              <Text style={styles.rejectButtonText}>👎</Text>
              <Text style={styles.actionButtonLabel}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => handleValidation('skip')}
              disabled={validating}
            >
              <Text style={styles.skipButtonText}>⏭</Text>
              <Text style={styles.actionButtonLabel}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleValidation('approve')}
              disabled={validating}
            >
              <Text style={styles.approveButtonText}>👍</Text>
              <Text style={styles.actionButtonLabel}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  earningsBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  earningsText: {
    color: '#fff',
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  statsCard: {
    backgroundColor: theme.colors.wave[50],
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  statsTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statsSubtext: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
  },
  refreshButton: {
    marginTop: theme.spacing.md,
  },
  mainCard: {
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 250,
    backgroundColor: theme.colors.backgroundDark,
  },
  trendImage: {
    width: '100%',
    height: '100%',
  },
  engagementOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    padding: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementIcon: {
    fontSize: 14,
  },
  engagementText: {
    color: '#fff',
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '500',
  },
  noImageContainer: {
    height: 200,
    backgroundColor: theme.colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
    opacity: 0.5,
  },
  noImageText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textMuted,
  },
  contentSection: {
    padding: theme.spacing.lg,
  },
  trendDescription: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  postCaption: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  tag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  tagText: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  qualitySection: {
    backgroundColor: theme.colors.backgroundDark,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  qualityTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
  },
  qualityScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    width: '48%',
  },
  criteriaIcon: {
    fontSize: 14,
  },
  criteriaText: {
    fontSize: theme.typography.caption.fontSize,
    flex: 1,
  },
  progressSection: {
    backgroundColor: theme.colors.wave[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  progressTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  actionPrompt: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  rejectButton: {
    backgroundColor: theme.colors.backgroundDark,
    borderWidth: 2,
    borderColor: theme.colors.error,
  },
  skipButton: {
    backgroundColor: theme.colors.backgroundDark,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  approveButton: {
    backgroundColor: theme.colors.success,
  },
  rejectButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  skipButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  approveButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionButtonLabel: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
  },
});