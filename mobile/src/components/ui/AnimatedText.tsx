import React, { useEffect } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { enhancedTheme } from '../../styles/theme.enhanced';

interface AnimatedTextProps {
  children: string;
  style?: TextStyle;
  gradient?: boolean;
  delay?: number;
  duration?: number;
  type?: 'fade' | 'slide' | 'scale' | 'typewriter';
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  style,
  gradient = false,
  delay = 0,
  duration = 600,
  type = 'fade',
}) => {
  const progress = useSharedValue(0);
  const typewriterProgress = useSharedValue(0);

  useEffect(() => {
    if (type === 'typewriter') {
      typewriterProgress.value = withDelay(
        delay,
        withTiming(children.length, { duration: duration })
      );
    } else {
      progress.value = withDelay(
        delay,
        withTiming(1, { duration })
      );
    }
  }, [children]);

  const animatedStyle = useAnimatedStyle(() => {
    switch (type) {
      case 'slide':
        return {
          opacity: progress.value,
          transform: [
            {
              translateY: interpolate(progress.value, [0, 1], [20, 0]),
            },
          ],
        };
      case 'scale':
        return {
          opacity: progress.value,
          transform: [
            {
              scale: interpolate(progress.value, [0, 1], [0.8, 1]),
            },
          ],
        };
      case 'typewriter':
        const displayedLength = Math.floor(typewriterProgress.value);
        return {
          opacity: 1,
        };
      default:
        return {
          opacity: progress.value,
        };
    }
  });

  const textContent = type === 'typewriter' 
    ? children.slice(0, Math.floor(typewriterProgress.value))
    : children;

  if (gradient) {
    // For gradient text, we'd need a different approach
    // React Native doesn't support gradient text directly
    return (
      <Animated.Text
        style={[
          {
            fontSize: 32,
            fontWeight: 'bold',
            color: enhancedTheme.colors.accent,
          },
          style,
          animatedStyle,
        ]}
      >
        {textContent}
      </Animated.Text>
    );
  }

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {textContent}
    </Animated.Text>
  );
};