import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import HapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../contexts/ThemeContext';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'gradient' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
  animated?: boolean;
  gradientColors?: string[];
  fullWidth?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  haptic = true,
  animated = true,
  gradientColors,
  fullWidth = false,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(disabled ? 0.5 : 1);
  const pressed = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const loadingRotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(disabled ? 0.5 : 1, { duration: 200 });
  }, [disabled]);

  useEffect(() => {
    if (loading) {
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      loadingRotation.value = 0;
    }
  }, [loading]);

  useEffect(() => {
    if (animated && variant === 'gradient') {
      shimmer.value = withRepeat(
        withSequence(
          withDelay(2000, withTiming(1, { duration: 1000 })),
          withTiming(0, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [animated, variant]);

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    pressed.value = withSpring(1);
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 150,
    });
    
    if (haptic) {
      HapticFeedback.trigger('impactLight');
    }
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0);
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    
    if (haptic) {
      HapticFeedback.trigger('impactMedium');
    }
    
    if (animated) {
      scale.value = withSequence(
        withSpring(1.05, { damping: 15, stiffness: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
    }
    
    runOnJS(onPress)();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const elevation = interpolate(
      pressed.value,
      [0, 1],
      [5, 2],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      elevation,
      shadowOpacity: interpolate(
        pressed.value,
        [0, 1],
        [0.2, 0.1],
        Extrapolate.CLAMP
      ),
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      opacity: shimmer.value,
    };
  });

  const loadingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${loadingRotation.value}deg` }],
    };
  });

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'gradient':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          borderWidth: 0,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.text;
      case 'outline':
      case 'ghost':
        return theme.colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getGradientColors = () => {
    return gradientColors || [theme.colors.primary, theme.colors.secondary];
  };

  const buttonContent = (
    <>
      {loading ? (
        <Animated.View style={loadingStyle}>
          <ActivityIndicator
            size={size === 'small' ? 'small' : 'small'}
            color={getTextColor()}
          />
        </Animated.View>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={getTextColor()}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              getSizeStyles(),
              { color: getTextColor() },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={getTextColor()}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </>
  );

  return (
    <Animated.View
      style={[
        animatedStyle,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.button,
          getSizeStyles(),
          getVariantStyles(),
          fullWidth && styles.fullWidth,
        ]}
      >
        {variant === 'gradient' ? (
          <>
            <LinearGradient
              colors={getGradientColors()}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            {animated && (
              <Animated.View style={[StyleSheet.absoluteFillObject, shimmerStyle]}>
                <LinearGradient
                  colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            )}
            {buttonContent}
          </>
        ) : (
          buttonContent
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    fontSize: 16,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    fontSize: 18,
  },
});