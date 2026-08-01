import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import type { Signal, Platform, ConfidenceLevel } from '../types';
import PlatformBadge from './PlatformBadge';
import ConfidenceBadge from './ConfidenceBadge';

interface SignalCardProps {
  signal: Signal;
  onPress: () => void;
  compact?: boolean;
}

const { colors, spacing, borderRadius, typography } = designSystem;

export default function SignalCard({ signal, onPress, compact = false }: SignalCardProps) {
  const getMomentumColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary;
    if (score >= 40) return colors.warning;
    return colors.text.tertiary;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatVelocity = (velocity: number) => {
    const sign = velocity >= 0 ? '+' : '';
    return `${sign}${velocity.toFixed(1)}%`;
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactLeft}>
          <PlatformBadge platform={signal.platform} size="small" />
          <View style={styles.compactInfo}>
            <Text style={styles.compactName} numberOfLines={1}>{signal.name}</Text>
            <Text style={styles.compactCategory}>{signal.category}</Text>
          </View>
        </View>
        <View style={styles.compactRight}>
          <Text style={[styles.momentumScore, { color: getMomentumColor(signal.momentum_score) }]}>
            {signal.momentum_score}
          </Text>
          <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PlatformBadge platform={signal.platform} />
          <View style={styles.badges}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{signal.signal_type}</Text>
            </View>
            <ConfidenceBadge confidence={signal.forecast_confidence} />
          </View>
        </View>
        <View style={styles.momentumContainer}>
          <Text style={styles.momentumLabel}>Momentum</Text>
          <Text style={[styles.momentumValue, { color: getMomentumColor(signal.momentum_score) }]}>
            {signal.momentum_score}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {signal.thumbnail_url && (
          <Image source={{ uri: signal.thumbnail_url }} style={styles.thumbnail} />
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{signal.name}</Text>
          <Text style={styles.identifier} numberOfLines={1}>{signal.identifier}</Text>
        </View>
      </View>

      {/* Metrics */}
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Volume</Text>
          <Text style={styles.metricValue}>{formatNumber(signal.current_volume)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Velocity</Text>
          <Text style={[
            styles.metricValue,
            { color: signal.velocity >= 0 ? colors.success : colors.danger }
          ]}>
            {formatVelocity(signal.velocity)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>vs Baseline</Text>
          <Text style={styles.metricValue}>{signal.category_baseline_multiple.toFixed(1)}x</Text>
        </View>
      </View>

      {/* Forecast */}
      {signal.forecast_mainstream_days !== null && (
        <View style={styles.forecast}>
          <Icon name="trending-up" size={16} color={colors.primary} />
          <Text style={styles.forecastText}>
            Projected mainstream in <Text style={styles.forecastHighlight}>{signal.forecast_mainstream_days} days</Text>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  compactName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '500',
  },
  compactCategory: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  momentumScore: {
    ...typography.h4,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  typeBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    ...typography.micro,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  momentumContainer: {
    alignItems: 'flex-end',
  },
  momentumLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  momentumValue: {
    ...typography.h2,
    fontWeight: '700',
  },
  content: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  identifier: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    ...typography.micro,
    color: colors.text.tertiary,
    marginBottom: spacing.xxs,
  },
  metricValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  forecast: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  forecastText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  forecastHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});
