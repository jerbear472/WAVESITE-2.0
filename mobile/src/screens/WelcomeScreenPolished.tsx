import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { enhancedTheme } from '../styles/theme.enhanced';
import HapticFeedback from 'react-native-haptic-feedback';
import Video from 'react-native-video';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, index }) => {
  return (
    <Animated.View
      entering={FadeInUp.delay(100 + index * 100).springify()}
      style={styles.featureCard}
    >
      <View style={styles.featureIconContainer}>
        <LinearGradient
          colors={enhancedTheme.colors.primaryGradient}
          style={styles.featureIconGradient}
        >
          <Icon name={icon} size={24} color="#ffffff" />
        </LinearGradient>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

export const WelcomeScreenPolished: React.FC = () => {
  const navigation = useNavigation<any>();
  const waveAnimation = useSharedValue(0);
  const floatAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    // Wave animation
    waveAnimation.value = withRepeat(
      withTiming(1, {
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // Float animation
    floatAnimation.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000 }),
        withTiming(10, { duration: 2000 })
      ),
      -1,
      true
    );

    // Pulse animation
    pulseAnimation.value = withRepeat(
      withSequence(
        withSpring(1.05, { damping: 10 }),
        withSpring(1, { damping: 10 })
      ),
      -1,
      true
    );
  }, []);

  const waveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          waveAnimation.value,
          [0, 1],
          [-50, 50]
        ),
      },
    ],
  }));

  const floatAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: floatAnimation.value,
      },
    ],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: pulseAnimation.value,
      },
    ],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={['#000d1a', '#001a33', '#002244', '#003366']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated Background Elements */}
      <View style={styles.backgroundElements}>
        <Animated.View style={[styles.wave, waveAnimatedStyle]} />
        <Animated.View style={[styles.wave, styles.wave2, waveAnimatedStyle]} />
        <View style={styles.gradientOrb} />
        <View style={[styles.gradientOrb, styles.gradientOrb2]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View 
            entering={FadeInDown.springify()}
            style={[styles.logoSection, floatAnimatedStyle]}
          >
            <Animated.View style={[styles.logoContainer, pulseAnimatedStyle]}>
              <LinearGradient
                colors={enhancedTheme.colors.primaryGradient}
                style={styles.logoGradient}
              >
                <Image
                  source={require('../assets/images/logo2.png')}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.appName}>WAVESIGHT</Text>
            <Text style={styles.tagline}>Ride the Wave of Tomorrow</Text>
          </Animated.View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <FeatureCard
              icon="trending-up"
              title="Spot Trends Early"
              description="Be the first to identify emerging trends"
              index={0}
            />
            <FeatureCard
              icon="cash-multiple"
              title="Build Reputation"
              description="Establish yourself as a trusted trend spotter"
              index={1}
            />
            <FeatureCard
              icon="account-group"
              title="Join the Community"
              description="Connect with fellow trend hunters"
              index={2}
            />
          </View>

          {/* Action Buttons */}
          <Animated.View 
            entering={FadeInUp.delay(400).springify()}
            style={styles.actionSection}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                HapticFeedback.trigger('impactMedium');
                navigation.navigate('Register');
              }}
            >
              <LinearGradient
                colors={enhancedTheme.colors.primaryGradient}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Icon name="arrow-right" size={20} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => {
                HapticFeedback.trigger('impactLight');
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.secondaryButtonText}>I already have an account</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Terms Text */}
          <Animated.View 
            entering={FadeInUp.delay(500).springify()}
            style={styles.termsContainer}
          >
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: -50,
    right: -50,
    height: 200,
    backgroundColor: 'rgba(0, 128, 255, 0.05)',
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    transform: [{ scaleX: 2 }],
  },
  wave2: {
    bottom: -50,
    backgroundColor: 'rgba(0, 212, 255, 0.03)',
  },
  gradientOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 128, 255, 0.1)',
    top: -100,
    right: -100,
  },
  gradientOrb2: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    top: '40%',
    left: -50,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 35,
    padding: 3,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: enhancedTheme.colors.text,
    letterSpacing: 3,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: enhancedTheme.colors.textSecondary,
    fontWeight: '500',
  },
  featuresSection: {
    marginVertical: 40,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureIconContainer: {
    marginRight: 16,
  },
  featureIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
  },
  actionSection: {
    marginTop: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    color: enhancedTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  termsText: {
    fontSize: 12,
    color: enhancedTheme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: enhancedTheme.colors.primary,
    fontWeight: '600',
  },
});