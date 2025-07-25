import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Logo } from '../components/Logo';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoadingComplete }) => {
  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(50);
  const titleOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const particlePositions = Array(15).fill(0).map(() => ({
    x: useSharedValue(Math.random() * width),
    y: useSharedValue(height + 50),
    opacity: useSharedValue(0),
  }));

  useEffect(() => {
    // Logo entrance animation
    logoScale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
    
    logoOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.exp),
    });

    // Title animation
    titleTranslateY.value = withDelay(
      300,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
      })
    );
    
    titleOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 600,
      })
    );

    // Progress bar animation
    progressWidth.value = withTiming(100, {
      duration: 3000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Particle animations
    particlePositions.forEach((particle, index) => {
      particle.opacity.value = withDelay(
        index * 100,
        withSequence(
          withTiming(0.8, { duration: 500 }),
          withRepeat(
            withSequence(
              withTiming(0.3, { duration: 1000 }),
              withTiming(0.8, { duration: 1000 })
            ),
            -1,
            true
          )
        )
      );

      particle.y.value = withDelay(
        index * 100,
        withRepeat(
          withTiming(-50, {
            duration: 5000 + Math.random() * 2000,
            easing: Easing.linear,
          }),
          -1,
          false
        )
      );

      particle.x.value = withRepeat(
        withSequence(
          withTiming(particle.x.value + 30, { duration: 2000 }),
          withTiming(particle.x.value - 30, { duration: 2000 })
        ),
        -1,
        true
      );
    });

    // Complete loading after animation
    if (onLoadingComplete) {
      const timer = setTimeout(() => {
        runOnJS(onLoadingComplete)();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const renderParticles = () => {
    return particlePositions.map((particle, index) => {
      const animatedStyle = useAnimatedStyle(() => ({
        transform: [
          { translateX: particle.x.value },
          { translateY: particle.y.value },
        ],
        opacity: particle.opacity.value,
      }));

      return (
        <Animated.View
          key={index}
          style={[styles.particle, animatedStyle]}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background particles */}
      {renderParticles()}

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Logo size="large" showText={false} />
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
        <Text style={styles.title}>WAVESIGHT</Text>
        <Text style={styles.subtitle}>Spot Trends, Earn Rewards</Text>
      </Animated.View>

      {/* Loading progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View style={[styles.progressBar, progressBarStyle]}>
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    zIndex: 10,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
    zIndex: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    letterSpacing: 1,
  },
  progressContainer: {
    width: width * 0.7,
    alignItems: 'center',
    zIndex: 10,
  },
  progressBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});