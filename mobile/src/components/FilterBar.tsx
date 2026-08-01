import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import type { Platform, SignalCategory, ConfidenceLevel } from '../types';

interface FilterBarProps {
  selectedPlatforms: Platform[];
  selectedCategories: SignalCategory[];
  selectedConfidence: ConfidenceLevel[];
  onPlatformToggle: (platform: Platform) => void;
  onCategoryToggle: (category: SignalCategory) => void;
  onConfidenceToggle: (confidence: ConfidenceLevel) => void;
  onClearAll: () => void;
}

const { colors, spacing, borderRadius, typography } = designSystem;

const platforms: Platform[] = ['tiktok', 'instagram', 'youtube', 'twitter'];
const categories: SignalCategory[] = ['music', 'fashion', 'food', 'fitness', 'beauty', 'tech', 'entertainment', 'lifestyle'];
const confidenceLevels: ConfidenceLevel[] = ['high', 'medium', 'low'];

const platformLabels: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'X',
};

export default function FilterBar({
  selectedPlatforms,
  selectedCategories,
  selectedConfidence,
  onPlatformToggle,
  onCategoryToggle,
  onConfidenceToggle,
  onClearAll,
}: FilterBarProps) {
  const hasFilters =
    selectedPlatforms.length > 0 ||
    selectedCategories.length > 0 ||
    selectedConfidence.length > 0;

  return (
    <View style={styles.container}>
      {/* Platform filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform);
          return (
            <TouchableOpacity
              key={platform}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onPlatformToggle(platform)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {platformLabels[platform]}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        {/* Confidence filters */}
        {confidenceLevels.map((level) => {
          const isSelected = selectedConfidence.includes(level);
          return (
            <TouchableOpacity
              key={level}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onConfidenceToggle(level)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}

        {hasFilters && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.clearButton} onPress={onClearAll}>
              <Icon name="close" size={16} color={colors.text.tertiary} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Category pills (second row if any selected) */}
      {selectedCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {selectedCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.chip, styles.chipSelected]}
              onPress={() => onCategoryToggle(category)}
            >
              <Text style={[styles.chipText, styles.chipTextSelected]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <Icon name="close" size={14} color={colors.text.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryScrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xxs,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.text.primary,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  clearText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
