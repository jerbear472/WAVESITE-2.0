import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import {
  useAccuracy,
  useAccuracyByCategory,
  useAccuracyByPlatform,
  useHitRate,
  useMeanAbsoluteError,
  useDataDepth,
} from '../hooks';
import { Header, MetricCard } from '../components';
import type { TimePeriod, SignalCategory, Platform } from '../types';

const { colors, spacing, borderRadius, typography } = designSystem;

const periods: { key: TimePeriod; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '14d', label: '14 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
];

const platformLabels: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'X',
};

export default function AccuracyScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');

  const { data: accuracy, isLoading, refetch, isRefetching } = useAccuracy(selectedPeriod);
  const { data: categoryAccuracy } = useAccuracyByCategory(selectedPeriod);
  const { data: platformAccuracy } = useAccuracyByPlatform(selectedPeriod);
  const { data: hitRate } = useHitRate(selectedPeriod);
  const { data: mae } = useMeanAbsoluteError(selectedPeriod);
  const { data: dataDepth } = useDataDepth();

  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 60) return colors.warning;
    return colors.danger;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Forecast Accuracy"
        subtitle="Performance metrics"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period.key && styles.periodTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Accuracy Card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardLabel}>Overall Forecast Accuracy</Text>
          <Text
            style={[
              styles.mainCardValue,
              { color: getAccuracyColor(accuracy?.accuracy_percentage || 0) },
            ]}
          >
            {accuracy?.accuracy_percentage?.toFixed(1) || 0}%
          </Text>
          <View style={styles.accuracyBar}>
            <View
              style={[
                styles.accuracyFill,
                {
                  width: `${accuracy?.accuracy_percentage || 0}%`,
                  backgroundColor: getAccuracyColor(accuracy?.accuracy_percentage || 0),
                },
              ]}
            />
          </View>
          <Text style={styles.mainCardSubtext}>
            {accuracy?.accurate_predictions || 0} of {accuracy?.total_predictions || 0} predictions accurate
          </Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Hit Rate"
            value={`${hitRate?.toFixed(1) || 0}%`}
            icon="bullseye-arrow"
            iconColor={colors.success}
            subtitle="Within 7 days"
          />
          <MetricCard
            title="Avg Error"
            value={`${mae?.toFixed(1) || 0}d`}
            icon="clock-alert-outline"
            iconColor={colors.warning}
            subtitle="Mean abs. error"
          />
        </View>

        {/* Data Depth */}
        <View style={styles.dataDepthCard}>
          <Icon name="database" size={20} color={colors.primary} />
          <Text style={styles.dataDepthText}>
            <Text style={styles.dataDepthValue}>{dataDepth || 0} months</Text> of historical signal data
          </Text>
        </View>

        {/* Platform Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Platform</Text>
          <View style={styles.breakdownCard}>
            {platformAccuracy && Object.entries(platformAccuracy).map(([platform, accuracy]) => (
              <View key={platform} style={styles.breakdownRow}>
                <View style={styles.breakdownLabel}>
                  <View
                    style={[
                      styles.platformDot,
                      { backgroundColor: colors.platforms[platform as Platform] },
                    ]}
                  />
                  <Text style={styles.breakdownText}>
                    {platformLabels[platform as Platform] || platform}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.breakdownValue,
                    { color: getAccuracyColor(accuracy) },
                  ]}
                >
                  {accuracy.toFixed(1)}%
                </Text>
              </View>
            ))}
            {(!platformAccuracy || Object.keys(platformAccuracy).length === 0) && (
              <Text style={styles.emptyText}>No data available</Text>
            )}
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Category</Text>
          <View style={styles.breakdownCard}>
            {categoryAccuracy && Object.entries(categoryAccuracy).map(([category, data]) => (
              <View key={category} style={styles.breakdownRow}>
                <Text style={styles.breakdownText}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownCount}>
                    ({data.total_predictions})
                  </Text>
                  <Text
                    style={[
                      styles.breakdownValue,
                      { color: getAccuracyColor(data.accuracy_percentage) },
                    ]}
                  >
                    {data.accuracy_percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
            {(!categoryAccuracy || Object.keys(categoryAccuracy).length === 0) && (
              <Text style={styles.emptyText}>No data available</Text>
            )}
          </View>
        </View>

        {/* Trust Statement */}
        <View style={styles.trustCard}>
          <Icon name="shield-check" size={24} color={colors.success} />
          <View style={styles.trustContent}>
            <Text style={styles.trustTitle}>Verified Accuracy</Text>
            <Text style={styles.trustText}>
              All accuracy metrics are calculated from completed forecast cycles with documented outcomes.
            </Text>
          </View>
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xxs,
    marginBottom: spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  periodTextActive: {
    color: colors.text.primary,
  },
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainCardLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  mainCardValue: {
    fontSize: 64,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  accuracyBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  accuracyFill: {
    height: '100%',
    borderRadius: 4,
  },
  mainCardSubtext: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dataDepthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dataDepthText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  dataDepthValue: {
    color: colors.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownCount: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  breakdownValue: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  trustCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.success}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  trustContent: {
    flex: 1,
  },
  trustTitle: {
    ...typography.bodyMedium,
    color: colors.success,
    marginBottom: spacing.xxs,
  },
  trustText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
});
