import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'default' | 'circle' | 'text' | 'card';
  lines?: number;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height = 20,
  borderRadius,
  style,
  variant = 'default',
  lines = 1,
  animated = true,
}) => {
  const { theme } = useTheme();
  const shimmerAnimation = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      shimmerAnimation.value = withRepeat(
        withTiming(1, {
          duration: 1500,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerAnimation.value,
      [0, 1],
      [-screenWidth, screenWidth]
    );

    return {
      transform: [{ translateX }],
    };
  });

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'circle':
        return {
          width: height,
          height,
          borderRadius: height / 2,
        };
      case 'text':
        return {
          width: width || '80%',
          height: 16,
          borderRadius: 4,
        };
      case 'card':
        return {
          width: width || '100%',
          height: height || 200,
          borderRadius: borderRadius || 12,
        };
      default:
        return {
          width: width || '100%',
          height,
          borderRadius: borderRadius || 4,
        };
    }
  };

  const baseColor = theme.dark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)';
  
  const shimmerColor = theme.dark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)';

  const renderSkeleton = (index: number = 0) => (
    <View
      key={index}
      style={[
        styles.skeleton,
        getVariantStyles(),
        { backgroundColor: baseColor },
        style,
        index > 0 && variant === 'text' && styles.textMargin,
      ]}
    >
      {animated && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            animatedStyle,
            { overflow: 'hidden' },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              shimmerColor,
              shimmerColor,
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmer}
          />
        </Animated.View>
      )}
    </View>
  );

  if (variant === 'text' && lines > 1) {
    return (
      <View>
        {Array.from({ length: lines }).map((_, index) => renderSkeleton(index))}
      </View>
    );
  }

  return renderSkeleton();
};

// Preset skeleton components
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader variant="circle" height={40} />
        <View style={styles.cardHeaderText}>
          <SkeletonLoader variant="text" width="60%" height={16} />
          <SkeletonLoader variant="text" width="40%" height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonLoader variant="default" height={150} style={{ marginVertical: 12 }} />
      <SkeletonLoader variant="text" lines={3} />
    </View>
  );
};

export const SkeletonList: React.FC<{ 
  count?: number;
  style?: ViewStyle;
}> = ({ count = 3, style }) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={index > 0 ? { marginTop: 16 } : undefined} />
      ))}
    </View>
  );
};

export const SkeletonProfile: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.profile, style]}>
      <SkeletonLoader variant="circle" height={80} />
      <SkeletonLoader variant="text" width="50%" height={20} style={{ marginTop: 16 }} />
      <SkeletonLoader variant="text" width="30%" height={16} style={{ marginTop: 8 }} />
      <View style={styles.profileStats}>
        <View style={styles.profileStat}>
          <SkeletonLoader variant="text" width={60} height={24} />
          <SkeletonLoader variant="text" width={50} height={14} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.profileStat}>
          <SkeletonLoader variant="text" width={60} height={24} />
          <SkeletonLoader variant="text" width={50} height={14} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.profileStat}>
          <SkeletonLoader variant="text" width={60} height={24} />
          <SkeletonLoader variant="text" width={50} height={14} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    flex: 1,
    width: screenWidth * 2,
  },
  textMargin: {
    marginTop: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  profile: {
    alignItems: 'center',
    padding: 20,
  },
  profileStats: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
    justifyContent: 'space-around',
  },
  profileStat: {
    alignItems: 'center',
  },
});