import React, { useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import HapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../contexts/ThemeContext';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'glass' | 'gradient' | 'solid';
  colors?: string[];
  delay?: number;
  index?: number;
  enableHaptic?: boolean;
  glowColor?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  style,
  variant = 'glass',
  colors,
  delay = 0,
  index = 0,
  enableHaptic = true,
  glowColor,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const pressed = useSharedValue(0);
  const glow = useSharedValue(0);

  // Default colors based on variant
  const getDefaultColors = () => {
    switch (variant) {
      case 'gradient':
        return colors || [theme.colors.primary, theme.colors.secondary];
      case 'glass':
        return colors || ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
      default:
        return colors || [theme.colors.surface, theme.colors.surface];
    }
  };

  useEffect(() => {
    // Entrance animation with stagger effect
    const animationDelay = delay + (index * 100);
    
    setTimeout(() => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 100,
      });
      
      opacity.value = withTiming(1, {
        duration: 600,
      });
      
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
      });
    }, animationDelay);

    // Subtle glow animation
    if (glowColor) {
      glow.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        true
      );
    }
  }, []);

  const handlePressIn = () => {
    pressed.value = withSpring(1);
    scale.value = withSpring(0.95);
    if (enableHaptic) {
      HapticFeedback.trigger('impactLight');
    }
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0);
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (enableHaptic) {
      HapticFeedback.trigger('impactMedium');
    }
    if (onPress) {
      runOnJS(onPress)();
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      pressed.value,
      [0, 1],
      [0.2, 0.1],
      Extrapolate.CLAMP
    );

    const elevation = interpolate(
      pressed.value,
      [0, 1],
      [10, 5],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
      shadowOpacity,
      elevation,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (!glowColor) return {};
    
    const glowOpacity = interpolate(
      glow.value,
      [0, 1],
      [0, 0.3],
      Extrapolate.CLAMP
    );

    return {
      shadowColor: glowColor,
      shadowOpacity: glowOpacity,
      shadowRadius: 20,
    };
  });

  const cardColors = getDefaultColors();

  const renderContent = () => {
    switch (variant) {
      case 'glass':
        return (
          <>
            <BlurView
              style={StyleSheet.absoluteFillObject}
              blurType={theme.dark ? 'dark' : 'light'}
              blurAmount={10}
              reducedTransparencyFallbackColor={theme.colors.surface}
            />
            <LinearGradient
              colors={cardColors}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {children}
          </>
        );
      
      case 'gradient':
        return (
          <>
            <LinearGradient
              colors={cardColors}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {children}
          </>
        );
      
      default:
        return children;
    }
  };

  if (onPress) {
    return (
      <Animated.View style={[animatedStyle, glowStyle, style]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[
            styles.card,
            variant === 'glass' && styles.glassCard,
            { backgroundColor: variant === 'solid' ? cardColors[0] : 'transparent' }
          ]}
        >
          {renderContent()}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        variant === 'glass' && styles.glassCard,
        { backgroundColor: variant === 'solid' ? cardColors[0] : 'transparent' },
        animatedStyle,
        glowStyle,
        style,
      ]}
    >
      {renderContent()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  glassCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});