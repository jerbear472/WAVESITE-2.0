import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';

const { height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreenClean: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo size="large" showText={true} />
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.headline}>
            For People Who{'\n'}
            <Text style={styles.highlightText}>Spot Trends First</Text>
          </Text>
          
          <Text style={styles.description}>
            Join the community that identifies what's next before everyone else catches on
          </Text>
        </View>

        {/* Buttons moved up, before features */}
        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('Register')}
            size="large"
            fullWidth
          />
          
          <Button
            title="I already have an account"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            size="medium"
            fullWidth
            style={styles.secondaryButton}
          />
        </View>

        <View style={styles.features}>
          <FeatureItem 
            icon="🔮"
            title="Spot the Signal"
            description="Find trends before the algorithm does"
          />
          <FeatureItem 
            icon="🌊"
            title="Track Evolution"
            description="Map how trends mutate across platforms"
          />
          <FeatureItem 
            icon="⚡"
            title="Earn XP"
            description="Build your WaveSight score with every call"
          />
        </View>

        <Text style={styles.footer}>
          Join the community of trend spotters
        </Text>
      </ScrollView>
    </View>
  );
};

const FeatureItem: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    opacity: 0.5,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: height * 0.08,
    paddingBottom: 64,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  headline: {
    fontSize: 48,
    fontWeight: '300',
    textAlign: 'center',
    color: theme.colors.text,
    lineHeight: 56,
    marginBottom: 24,
    letterSpacing: -1.5,
  },
  highlightText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  description: {
    fontSize: 18,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: theme.spacing.md,
  },
  buttonContainer: {
    marginBottom: theme.spacing.xxl,
    marginTop: theme.spacing.lg,
  },
  secondaryButton: {
    marginTop: theme.spacing.md,
  },
  features: {
    marginBottom: theme.spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 20,
    width: 48,
    textAlign: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  featureDescription: {
    fontSize: 15,
    color: theme.colors.textLight,
    lineHeight: 22,
  },
  footer: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});