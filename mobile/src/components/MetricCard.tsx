import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  compact?: boolean;
}

const { colors, spacing, borderRadius, typography } = designSystem;

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = colors.primary,
  trend,
  trendValue,
  compact = false,
}: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return colors.success;
    if (trend === 'down') return colors.danger;
    return colors.text.tertiary;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return 'trending-up';
    if (trend === 'down') return 'trending-down';
    return 'minus';
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {icon && (
          <View style={[styles.compactIconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Icon name={icon} size={16} color={iconColor} />
          </View>
        )}
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>{title}</Text>
          <Text style={styles.compactValue}>{value}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Icon name={icon} size={20} color={iconColor} />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={styles.value}>{value}</Text>

      {(subtitle || trend) && (
        <View style={styles.footer}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {trend && trendValue && (
            <View style={styles.trendContainer}>
              <Icon name={getTrendIcon()} size={14} color={getTrendColor()} />
              <Text style={[styles.trendValue, { color: getTrendColor() }]}>
                {trendValue}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
  },
  compactContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactTitle: {
    ...typography.micro,
    color: colors.text.tertiary,
  },
  value: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  compactValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  compactContent: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  trendValue: {
    ...typography.caption,
    fontWeight: '600',
  },
});
