import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '../styles/designSystem';
import { useAuth } from '../contexts';
import { Button, Input } from '../components';

const { colors, spacing, typography, borderRadius } = designSystem;

export default function LoginScreen() {
  const { signIn, signUp, isLoading } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp) {
      const result = await signUp(email, password, organizationName);
      if (result.error) {
        setError(result.error);
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/app-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>WaveSight</Text>
            <Text style={styles.subtitle}>Enterprise Signal Intelligence</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isSignUp
                ? 'Start detecting early signals today'
                : 'Sign in to access your dashboard'}
            </Text>

            {isSignUp && (
              <Input
                value={organizationName}
                onChangeText={setOrganizationName}
                placeholder="Acme Inc."
                label="Organization Name"
                icon="domain"
                autoCapitalize="words"
              />
            )}

            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              label="Email"
              icon="email"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              label="Password"
              icon="lock"
              secureTextEntry
              autoComplete="password"
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title={isSignUp ? 'Create Account' : 'Sign In'}
              onPress={handleSubmit}
              loading={isLoading}
              fullWidth
              size="large"
            />

            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {isSignUp
                  ? 'Already have an account? '
                  : "Don't have an account? "}
                <Text style={styles.toggleTextHighlight}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: `${colors.danger}20`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    textAlign: 'center',
  },
  toggleButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  toggleTextHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
