import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { SafeScreen } from '../components/SafeScreen';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

export const WelcomeScreenEnhanced: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <LinearGradient
      colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
      style={styles.container}
    >
      <SafeScreen scroll={false}>
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={enhancedTheme.gradients.primary}
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
            >
              <LinearGradient
                colors={enhancedTheme.gradients.primary}
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
      </SafeScreen>
    </LinearGradient>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: enhancedTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '800',
    color: enhancedTheme.colors.text,
    letterSpacing: 3,
    marginBottom: 16,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 24,
    fontWeight: '600',
    color: enhancedTheme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  featureEmoji: {
    fontSize: 32,
    width: 50,
  },
  featureText: {
    flex: 1,
    fontSize: 17,
    color: enhancedTheme.colors.text,
    lineHeight: 24,
    fontWeight: '500',
  },
  buttonsSection: {
    paddingBottom: 40,
    gap: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: enhancedTheme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: enhancedTheme.colors.primary,
    paddingHorizontal: 30,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: enhancedTheme.colors.primary,
    letterSpacing: 0.3,
  },
});