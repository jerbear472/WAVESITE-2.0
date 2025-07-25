import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { completeTheme } from '../styles/theme.complete';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreenComplete: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <LinearGradient
      colors={completeTheme.gradients.dark}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={completeTheme.colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={completeTheme.gradients.primary}
                style={styles.logoBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="wave" size={60} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
            <Text style={styles.brandName}>WAVESIGHT</Text>
            
            <View style={styles.taglineContainer}>
              <Text style={styles.tagline}>Catch the Wave</Text>
              <Text style={styles.subtitle}>
                Ride the wave of trends{'\n'}before they break
              </Text>
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>📈</Text>
              <Text style={styles.featureText}>Track trending content across platforms</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🎯</Text>
              <Text style={styles.featureText}>Spot viral content before it explodes</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💰</Text>
              <Text style={styles.featureText}>Earn rewards for early trend discovery</Text>
            </View>
          </View>

          {/* Buttons Section */}
          <View style={styles.buttonsSection}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.9}
              style={styles.primaryButtonWrapper}
            >
              <LinearGradient
                colors={completeTheme.gradients.primary}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>I have an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
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
    paddingHorizontal: completeTheme.spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: completeTheme.screen.height * 0.08,
    marginBottom: completeTheme.spacing.xl,
  },
  logoContainer: {
    marginBottom: completeTheme.spacing.lg,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: completeTheme.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    ...completeTheme.shadows.primary,
  },
  brandName: {
    fontSize: completeTheme.typography.fontSize['6xl'],
    fontWeight: completeTheme.typography.fontWeight.extrabold,
    color: completeTheme.colors.text,
    letterSpacing: completeTheme.typography.letterSpacing.widest,
    marginBottom: completeTheme.spacing.md,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: completeTheme.typography.fontSize['2xl'],
    fontWeight: completeTheme.typography.fontWeight.semibold,
    color: completeTheme.colors.primary,
    marginBottom: completeTheme.spacing.sm,
  },
  subtitle: {
    fontSize: completeTheme.typography.fontSize.lg,
    color: completeTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: completeTheme.typography.fontSize.lg * completeTheme.typography.lineHeight.relaxed,
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: completeTheme.spacing.lg,
    gap: completeTheme.spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: completeTheme.spacing.lg,
    paddingVertical: completeTheme.spacing.sm,
  },
  featureEmoji: {
    fontSize: 32,
    width: 48,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.text,
    lineHeight: completeTheme.typography.fontSize.base * completeTheme.typography.lineHeight.relaxed,
    fontWeight: completeTheme.typography.fontWeight.medium,
  },
  buttonsSection: {
    paddingBottom: completeTheme.spacing.xl,
    gap: completeTheme.spacing.md,
  },
  primaryButtonWrapper: {
    ...completeTheme.shadows.primary,
  },
  primaryButton: {
    height: completeTheme.components.button.height.lg,
    borderRadius: completeTheme.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: completeTheme.components.button.fontSize.lg,
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: completeTheme.typography.letterSpacing.wide,
  },
  secondaryButton: {
    height: completeTheme.components.button.height.lg,
    borderRadius: completeTheme.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: completeTheme.colors.primary,
    paddingHorizontal: completeTheme.components.button.paddingHorizontal.lg,
  },
  secondaryButtonText: {
    fontSize: completeTheme.components.button.fontSize.lg,
    fontWeight: completeTheme.typography.fontWeight.semibold,
    color: completeTheme.colors.primary,
    letterSpacing: completeTheme.typography.letterSpacing.wide,
  },
});