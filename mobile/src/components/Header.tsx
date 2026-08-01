import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  leftIcon?: string;
  leftAction?: () => void;
  rightIcon?: string;
  rightAction?: () => void;
  rightBadge?: number;
}

const { colors, spacing, typography } = designSystem;

export default function Header({
  title,
  subtitle,
  showLogo = false,
  leftIcon,
  leftAction,
  rightIcon,
  rightAction,
  rightBadge,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.content}>
        {/* Left */}
        <View style={styles.left}>
          {leftIcon && leftAction ? (
            <TouchableOpacity onPress={leftAction} style={styles.iconButton}>
              <Icon name={leftIcon} size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>

        {/* Center */}
        <View style={styles.center}>
          {showLogo ? (
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/app-icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>WaveSight</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          )}
        </View>

        {/* Right */}
        <View style={styles.right}>
          {rightIcon && rightAction ? (
            <TouchableOpacity onPress={rightAction} style={styles.iconButton}>
              <Icon name={rightIcon} size={24} color={colors.text.primary} />
              {rightBadge !== undefined && rightBadge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {rightBadge > 99 ? '99+' : rightBadge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 28,
    height: 28,
  },
  logoText: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.micro,
    color: colors.text.primary,
    fontWeight: '700',
  },
});
