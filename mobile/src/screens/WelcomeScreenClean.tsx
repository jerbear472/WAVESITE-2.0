import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';

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
            Catch the Wave of{'\n'}
            <Text style={styles.highlightText}>Social Trends</Text>
          </Text>
          
          <Text style={styles.description}>
            Discover what's trending, validate content, and earn rewards for your insights
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem 
            icon="📈"
            title="Spot Trends"
            description="Identify emerging trends before they go viral"
          />
          <FeatureItem 
            icon="✓"
            title="Validate Content"
            description="Help verify and curate quality content"
          />
          <FeatureItem 
            icon="💰"
            title="Earn Rewards"
            description="Get paid for your valuable contributions"
          />
        </View>

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

        <Text style={styles.footer}>
          Join thousands of trend spotters worldwide
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
    paddingTop: theme.spacing.xxl * 2,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  headline: {
    fontSize: 36,
    fontWeight: '300',
    textAlign: 'center',
    color: theme.colors.text,
    lineHeight: 44,
    marginBottom: theme.spacing.md,
  },
  highlightText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  description: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing.lg,
  },
  features: {
    marginBottom: theme.spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  featureDescription: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: theme.spacing.xl,
  },
  secondaryButton: {
    marginTop: theme.spacing.md,
  },
  footer: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});