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
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Logo } from '../components/Logo';
import { SafeScreen } from '../components/SafeScreen';
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <SafeScreen scroll={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Logo size="large" showText={true} />
            <Text style={styles.tagline}>Catch the Wave</Text>
            <Text style={styles.subtitle}>Ride the wave of trends</Text>
            <Text style={styles.subtitle}>before they break</Text>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📈</Text>
              <Text style={styles.featureText}>Track trending content across platforms</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>Spot viral content before it explodes</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>💰</Text>
              <Text style={styles.featureText}>Earn rewards for early trend discovery</Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0080ff', '#00d4ff']}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000d1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 60,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4da8ff',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#4da8ff',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 24,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 10,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 20,
    width: 50,
  },
  featureText: {
    fontSize: 17,
    color: '#ffffff',
    flex: 1,
    lineHeight: 24,
    fontWeight: '500',
  },
  buttons: {
    paddingBottom: 20,
    gap: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0080ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0080ff',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});