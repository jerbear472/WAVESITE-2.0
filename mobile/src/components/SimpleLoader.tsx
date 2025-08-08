import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SimpleLoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const SimpleLoader: React.FC<SimpleLoaderProps> = ({
  size = 'medium',
  color = '#3b82f6',
  style,
}) => {
  const rotation = useSharedValue(0);

  const sizes = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const borderWidth = {
    small: 2,
    medium: 3,
    large: 4,
  };

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const loaderSize = sizes[size];
  const loaderBorderWidth = borderWidth[size];

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.loader,
          animatedStyle,
          {
            width: loaderSize,
            height: loaderSize,
            borderWidth: loaderBorderWidth,
            borderColor: `${color}20`,
            borderTopColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    borderRadius: 50,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default SimpleLoader;