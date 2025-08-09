import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { enhancedTheme } from '../styles/theme.enhanced';

const { width, height } = Dimensions.get('window');

export const LoadingScreenEnhanced: React.FC = () => {
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const particleProgress = useSharedValue(0);

  useEffect(() => {
    // Logo animation
    logoScale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });

    // Rotation animation
    logoRotation.value = withRepeat(
      withTiming(360, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1
    );

    // Text fade in
    textOpacity.value = withSequence(
      withTiming(0, { duration: 500 }),
      withTiming(1, { duration: 1000 })
    );

    // Particle animation
    particleProgress.value = withRepeat(
      withTiming(1, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const renderParticles = () => {
    return Array.from({ length: 6 }).map((_, index) => {
      const particleStyle = useAnimatedStyle(() => {
        const progress = (particleProgress.value + index / 6) % 1;
        const scale = interpolate(progress, [0, 0.5, 1], [0, 1, 0]);
        const radius = interpolate(progress, [0, 1], [50, 150]);
        const angle = (index * 60) * Math.PI / 180;
        
        return {
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: enhancedTheme.colors.accent,
          opacity: interpolate(progress, [0, 0.5, 1], [0, 0.8, 0]),
          transform: [
            { translateX: Math.cos(angle) * radius },
            { translateY: Math.sin(angle) * radius },
            { scale },
          ],
        };
      });

      return <Animated.View key={index} style={particleStyle} />;
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.logo, logoAnimatedStyle]}>
            <LinearGradient
              colors={enhancedTheme.colors.primaryGradient}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>W</Text>
            </LinearGradient>
          </Animated.View>
          {renderParticles()}
        </View>
        
        <Animated.View style={textAnimatedStyle}>
          <Text style={styles.title}>WaveSight</Text>
          <Text style={styles.subtitle}>Ride the Wave of Trends</Text>
        </Animated.View>
        
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <Animated.View
              style={[
                styles.loadingProgress,
                {
                  width: '100%',
                },
              ]}
            >
              <LinearGradient
                colors={enhancedTheme.colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
          <Text style={styles.loadingText}>Loading amazing things...</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    overflow: 'hidden',
    ...enhancedTheme.shadows.lg,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  title: {
    ...enhancedTheme.typography.displaySmall,
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 60,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingBar: {
    width: width * 0.6,
    height: 4,
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingProgress: {
    height: '100%',
  },
  loadingText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
  },
});