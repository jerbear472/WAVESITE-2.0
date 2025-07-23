import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Logo } from '../components/Logo';
import { SafeScreen } from '../components/SafeScreen';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeScreen scroll={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Logo size="large" showText={true} />
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
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('Register')}
            size="large"
            style={styles.primaryButton}
          />

          <Button
            title="I have an account"
            onPress={() => navigation.navigate('Login')}
            variant="secondary"
            size="large"
          />
        </View>
      </View>
    </SafeScreen>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000d1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 50,
  },
  logo: {
    fontSize: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0080ff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 20,
    color: '#4da8ff',
    marginTop: 5,
    fontWeight: '500',
  },
  features: {
    marginBottom: 50,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 10,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 15,
    width: 40,
  },
  featureText: {
    fontSize: 17,
    color: '#ffffff',
    flex: 1,
    lineHeight: 22,
  },
  buttons: {
    marginTop: 'auto',
  },
  primaryButton: {
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#0080ff',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0080ff',
    fontSize: 18,
    fontWeight: '600',
  },
});