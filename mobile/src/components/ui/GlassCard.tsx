import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { enhancedTheme } from '../../styles/theme.enhanced';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  animated?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  animated = true,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  const handlePressIn = () => {
    if (animated) {
      scale.value = withSpring(0.98);
    }
  };

  const handlePressOut = () => {
    if (animated) {
      scale.value = withSpring(1);
    }
  };

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)'];
      case 'secondary':
        return ['rgba(240, 147, 251, 0.1)', 'rgba(245, 87, 108, 0.1)'];
      default:
        return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'];
    }
  };

  const content = (
    <>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.border} />
      <View style={styles.content}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, style, animated && animatedStyle]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[styles.container, style, animated && animatedStyle]}>
      {content}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: enhancedTheme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: enhancedTheme.colors.glass,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: enhancedTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
  },
  content: {
    padding: enhancedTheme.spacing.lg,
  },
});