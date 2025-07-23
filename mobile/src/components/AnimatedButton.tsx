import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../styles/theme';

interface AnimatedButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  gradient?: string[];
  textStyle?: TextStyle;
  containerStyle?: ViewStyle;
  onPress?: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  gradient,
  style,
  textStyle,
  containerStyle,
  onPress,
  disabled,
  ...props
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : opacity.value,
  }));

  const getButtonStyles = () => {
    const sizeStyles = {
      small: { paddingVertical: 8, paddingHorizontal: 16 },
      medium: { paddingVertical: 14, paddingHorizontal: 28 },
      large: { paddingVertical: 18, paddingHorizontal: 36 },
    };

    const variantStyles = {
      primary: { backgroundColor: theme.colors.primary },
      secondary: { backgroundColor: 'rgba(255,255,255,0.1)' },
      ghost: { backgroundColor: 'transparent' },
    };

    return [
      styles.button,
      sizeStyles[size],
      variantStyles[variant],
      style,
    ];
  };

  const getTextStyles = () => {
    const sizeStyles = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles = {
      primary: { color: '#FFFFFF' },
      secondary: { color: '#FFFFFF' },
      ghost: { color: theme.colors.primary },
    };

    return [
      styles.text,
      sizeStyles[size],
      variantStyles[variant],
      textStyle,
    ];
  };

  const defaultGradient = variant === 'primary' 
    ? [theme.colors.primary, '#45B7D1']
    : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'];

  const buttonContent = (
    <Text style={getTextStyles()}>{title}</Text>
  );

  return (
    <AnimatedTouchableOpacity
      style={[animatedStyle, containerStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      {gradient || variant === 'primary' ? (
        <AnimatedLinearGradient
          colors={gradient || defaultGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={getButtonStyles()}
        >
          {buttonContent}
        </AnimatedLinearGradient>
      ) : (
        <Animated.View style={getButtonStyles()}>
          {buttonContent}
        </Animated.View>
      )}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '600',
  },
});