import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

interface AnimatedLoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({
  size = 'medium',
  color = '#0080ff',
}) => {
  const rotation = useSharedValue(0);
  const scale1 = useSharedValue(0);
  const scale2 = useSharedValue(0);
  const scale3 = useSharedValue(0);

  const sizes = {
    small: 40,
    medium: 60,
    large: 80,
  };

  const dotSize = sizes[size] / 4;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1
    );

    scale1.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 400 }),
        withTiming(1, { duration: 400 })
      ),
      -1,
      true
    );

    scale2.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      )
    );

    scale3.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const dot1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: interpolate(scale1.value, [1, 1.2], [0.6, 1]),
  }));

  const dot2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: interpolate(scale2.value, [1, 1.2], [0.6, 1]),
  }));

  const dot3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
    opacity: interpolate(scale3.value, [1, 1.2], [0.6, 1]),
  }));

  return (
    <View style={[styles.container, { width: sizes[size], height: sizes[size] }]}>
      <Animated.View style={[styles.dotsContainer, containerAnimatedStyle]}>
        <Animated.View
          style={[
            styles.dot,
            dot1AnimatedStyle,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              position: 'absolute',
              top: 0,
              left: sizes[size] / 2 - dotSize / 2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            dot2AnimatedStyle,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              position: 'absolute',
              bottom: 0,
              right: 0,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            dot3AnimatedStyle,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              position: 'absolute',
              bottom: 0,
              left: 0,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

export const SkeletonLoader: React.FC<{ height?: number; style?: any }> = ({ 
  height = 20, 
  style 
}) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmer.value,
      [0, 1],
      [-width, width]
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[styles.skeleton, { height }, style]}>
      <Animated.View style={[styles.shimmer, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.2)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    width: '100%',
    height: '100%',
  },
  dot: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  skeleton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
});