import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import { useSignal, useSignalHistory } from '../hooks';
import { Header, PlatformBadge, ConfidenceBadge, MetricCard } from '../components';
import type { RootStackParamList } from '../navigation';

const { colors, spacing, borderRadius, typography } = designSystem;

type RouteParams = RouteProp<RootStackParamList, 'SignalDetail'>;

export default function SignalDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { signalId } = route.params;

  const { data: signal, isLoading } = useSignal(signalId);
  const { data: history } = useSignalHistory(signalId);

  const handleShare = async () => {
    if (!signal) return;
    try {
      await Share.share({
        message: `Check out this trend signal on WaveSight: ${signal.name}`,
        title: 'WaveSight Signal',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getMomentumColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary;
    if (score >= 40) return colors.warning;
    return colors.text.tertiary;
  };

  if (isLoading || !signal) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Signal Details"
          leftIcon="close"
          leftAction={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Signal Details"
        leftIcon="close"
        leftAction={() => navigation.goBack()}
        rightIcon="share-variant"
        rightAction={handleShare}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {signal.thumbnail_url && (
            <Image source={{ uri: signal.thumbnail_url }} style={styles.thumbnail} />
          )}
          <View style={styles.heroInfo}>
            <View style={styles.badges}>
              <PlatformBadge platform={signal.platform} showLabel />
              <ConfidenceBadge confidence={signal.forecast_confidence} />
            </View>
            <Text style={styles.signalName}>{signal.name}</Text>
            <Text style={styles.signalIdentifier}>{signal.identifier}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{signal.category}</Text>
            </View>
          </View>
        </View>

        {/* Momentum Score */}
        <View style={styles.momentumCard}>
          <Text style={styles.momentumLabel}>Momentum Score</Text>
          <Text style={[styles.momentumValue, { color: getMomentumColor(signal.momentum_score) }]}>
            {signal.momentum_score}
          </Text>
          <View style={styles.momentumBar}>
            <View
              style={[
                styles.momentumFill,
                {
                  width: `${signal.momentum_score}%`,
                  backgroundColor: getMomentumColor(signal.momentum_score),
                },
              ]}
            />
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Current Volume"
            value={formatNumber(signal.current_volume)}
            icon="chart-bar"
            iconColor={colors.primary}
          />
          <MetricCard
            title="Velocity"
            value={`${signal.velocity >= 0 ? '+' : ''}${signal.velocity.toFixed(1)}%`}
            icon="speedometer"
            iconColor={signal.velocity >= 0 ? colors.success : colors.danger}
          />
          <MetricCard
            title="vs Baseline"
            value={`${signal.category_baseline_multiple.toFixed(1)}x`}
            icon="trending-up"
            iconColor={colors.warning}
          />
          <MetricCard
            title="Days Active"
            value={signal.days_since_detection}
            icon="calendar-clock"
            iconColor={colors.info}
          />
        </View>

        {/* Forecast Section */}
        {signal.forecast_mainstream_days !== null && (
          <View style={styles.forecastSection}>
            <Text style={styles.sectionTitle}>Forecast</Text>
            <View style={styles.forecastCard}>
              <View style={styles.forecastRow}>
                <Icon name="crystal-ball" size={24} color={colors.primary} />
                <View style={styles.forecastInfo}>
                  <Text style={styles.forecastLabel}>Projected Mainstream</Text>
                  <Text style={styles.forecastValue}>
                    {signal.forecast_mainstream_days} days
                  </Text>
                </View>
              </View>
              {signal.forecast_peak_volume && (
                <View style={styles.forecastRow}>
                  <Icon name="chart-areaspline" size={24} color={colors.success} />
                  <View style={styles.forecastInfo}>
                    <Text style={styles.forecastLabel}>Peak Volume Estimate</Text>
                    <Text style={styles.forecastValue}>
                      {formatNumber(signal.forecast_peak_volume)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Historical Context */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historical Context</Text>
          <View style={styles.historyCard}>
            <Text style={styles.historyText}>
              This signal is growing{' '}
              <Text style={styles.historyHighlight}>
                {signal.category_baseline_multiple.toFixed(1)}x faster
              </Text>{' '}
              than the typical {signal.category} signal baseline.
            </Text>
            <Text style={styles.historySubtext}>
              First detected {signal.days_since_detection} days ago
            </Text>
          </View>
        </View>

        {/* Outcome (if exists) */}
        {signal.outcome && (
          <View style={styles.outcomeSection}>
            <Text style={styles.sectionTitle}>Outcome Tracking</Text>
            <View style={[
              styles.outcomeCard,
              { borderColor: signal.outcome.reached_mainstream ? colors.success : colors.text.tertiary }
            ]}>
              <View style={styles.outcomeHeader}>
                <Icon
                  name={signal.outcome.reached_mainstream ? 'check-circle' : 'clock-outline'}
                  size={24}
                  color={signal.outcome.reached_mainstream ? colors.success : colors.text.tertiary}
                />
                <Text style={[
                  styles.outcomeStatus,
                  { color: signal.outcome.reached_mainstream ? colors.success : colors.text.tertiary }
                ]}>
                  {signal.outcome.reached_mainstream ? 'Reached Mainstream' : 'Pending'}
                </Text>
              </View>
              {signal.outcome.reached_mainstream && (
                <>
                  <Text style={styles.outcomeDetail}>
                    Actual days to mainstream: {signal.outcome.days_to_mainstream}
                  </Text>
                  <Text style={styles.outcomeDetail}>
                    Forecast accuracy: {signal.outcome.forecast_accuracy_percentage.toFixed(0)}%
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="bell-plus-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Create Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="export" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Export Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  signalName: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  signalIdentifier: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    ...typography.micro,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  momentumCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  momentumLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  momentumValue: {
    fontSize: 56,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  momentumBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  momentumFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  forecastSection: {
    marginBottom: spacing.lg,
  },
  forecastCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  forecastInfo: {
    flex: 1,
  },
  forecastLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  forecastValue: {
    ...typography.h4,
    color: colors.text.primary,
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyText: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  historyHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  historySubtext: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  outcomeSection: {
    marginBottom: spacing.lg,
  },
  outcomeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  outcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  outcomeStatus: {
    ...typography.bodyMedium,
  },
  outcomeDetail: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
