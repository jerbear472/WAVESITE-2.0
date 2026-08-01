import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const { colors, spacing, borderRadius, typography } = designSystem;

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceLight;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surface;
      case 'ghost':
        return 'transparent';
      case 'danger':
        return colors.danger;
      case 'outline':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.text.disabled;
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.text.primary;
      case 'secondary':
        return colors.primary;
      case 'ghost':
        return colors.primary;
      case 'outline':
        return colors.primary;
      default:
        return colors.text.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'outline':
        return colors.primary;
      case 'secondary':
        return colors.border;
      default:
        return 'transparent';
    }
  };

  const sizeStyles = {
    small: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: typography.buttonSmall.fontSize,
      iconSize: 16,
    },
    medium: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: typography.button.fontSize,
      iconSize: 20,
    },
    large: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      fontSize: typography.buttonLarge.fontSize,
      iconSize: 24,
    },
  };

  const currentSize = sizeStyles[size];
  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
        },
        fullWidth && styles.fullWidth,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={currentSize.iconSize}
              color={textColor}
              style={styles.iconLeft}
            />
          )}
          <Text style={[styles.text, { color: textColor, fontSize: currentSize.fontSize }]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={currentSize.iconSize}
              color={textColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
