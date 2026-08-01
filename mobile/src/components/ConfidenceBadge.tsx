import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designSystem } from '../styles/designSystem';
import type { ConfidenceLevel } from '../types';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  showLabel?: boolean;
}

const { colors, spacing, borderRadius, typography } = designSystem;

const confidenceConfig: Record<ConfidenceLevel, { color: string; bgColor: string; label: string }> = {
  low: { color: colors.text.tertiary, bgColor: colors.surfaceLight, label: 'Low' },
  medium: { color: colors.warning, bgColor: `${colors.warning}20`, label: 'Medium' },
  high: { color: colors.success, bgColor: `${colors.success}20`, label: 'High' },
};

export default function ConfidenceBadge({ confidence, showLabel = true }: ConfidenceBadgeProps) {
  const config = confidenceConfig[confidence];

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.micro,
    fontWeight: '600',
  },
});
