import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import type { Platform } from '../types';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const { colors, spacing, borderRadius, typography } = designSystem;

const platformConfig: Record<Platform, { icon: string; color: string; label: string }> = {
  tiktok: { icon: 'music-note', color: colors.platforms.tiktok, label: 'TikTok' },
  instagram: { icon: 'instagram', color: colors.platforms.instagram, label: 'Instagram' },
  youtube: { icon: 'youtube', color: colors.platforms.youtube, label: 'YouTube' },
  twitter: { icon: 'twitter', color: colors.platforms.twitter, label: 'X' },
};

export default function PlatformBadge({ platform, size = 'medium', showLabel = false }: PlatformBadgeProps) {
  const config = platformConfig[platform];

  const sizeConfig = {
    small: { container: 24, icon: 14, fontSize: 10 },
    medium: { container: 32, icon: 18, fontSize: 12 },
    large: { container: 44, icon: 24, fontSize: 14 },
  };

  const { container, icon, fontSize } = sizeConfig[size];

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.container,
        {
          width: container,
          height: container,
          backgroundColor: `${config.color}20`,
        }
      ]}>
        <Icon name={config.icon} size={icon} color={config.color} />
      </View>
      {showLabel && (
        <Text style={[styles.label, { fontSize, color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  container: {
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
