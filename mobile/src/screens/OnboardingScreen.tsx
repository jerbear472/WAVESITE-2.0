import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';

const { height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Text style={styles.logoText}>〰️〰️〰️</Text>
          </View>
        </View>

        {/* Brand Name */}
        <Text style={styles.brandName}>WAVESIGHT</Text>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.taglineMain}>Catch the Wave</Text>
          <Text style={styles.taglineSubtitle}>
            Ride the wave of trends{'\n'}before they break
          </Text>
        </View>

        {/* I already have an account button - POSITIONED HIGHER */}
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={onSignIn}>
          <Text style={styles.signInButtonText}>I already have an account</Text>
        </TouchableOpacity>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📹</Text>
            <Text style={styles.featureText}>Share social media content</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Spot emerging trends early</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureText}>Earn rewards for discoveries</Text>
          </View>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={onGetStarted}>
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000814',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: height * 0.08,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#0a1929',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  logoText: {
    fontSize: 28,
    color: '#0066ff',
  },
  brandName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 30,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  taglineMain: {
    fontSize: 28,
    fontWeight: '600',
    color: '#0066ff',
    marginBottom: 10,
  },
  taglineSubtitle: {
    fontSize: 20,
    color: '#4d7ea8',
    textAlign: 'center',
    lineHeight: 28,
  },
  signInButton: {
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#0066ff',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginVertical: 25,
  },
  signInButtonText: {
    color: '#0066ff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 40,
    gap: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  featureIcon: {
    fontSize: 28,
    width: 40,
  },
  featureText: {
    fontSize: 20,
    color: '#fff',
    flex: 1,
  },
  getStartedButton: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    backgroundColor: '#0066ff',
    borderRadius: 35,
    paddingVertical: 20,
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default OnboardingScreen;