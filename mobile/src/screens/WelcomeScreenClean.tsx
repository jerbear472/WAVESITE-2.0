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
            Get Paid to{'\n'}
            <Text style={styles.highlightText}>Spot Trends</Text>
          </Text>
          
          <Text style={styles.description}>
            Turn your social media scrolling into cash by identifying viral content before it takes off
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
            icon="👀"
            title="Spot Early"
            description="Find trending content before it goes viral"
          />
          <FeatureItem 
            icon="✅"
            title="Validate"
            description="Verify and rate emerging trends"
          />
          <FeatureItem 
            icon="💵"
            title="Get Paid"
            description="Earn real money for accurate predictions"
          />
        </View>

        <Text style={styles.footer}>
          Join 10,000+ users earning daily
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: height * 0.08, // Reduced top padding
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl, // Reduced margin
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl, // Reduced margin
  },
  headline: {
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.colors.text,
    lineHeight: 50,
    marginBottom: theme.spacing.md,
    letterSpacing: -1,
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
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    lineHeight: 18,
  },
  footer: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});