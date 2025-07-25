import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { useAuth } from '../hooks/useAuth';
import { completeTheme } from '../styles/theme.complete';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreenComplete: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email.trim(), password, {
        display_name: displayName.trim(),
      });
      
      if (error) {
        if (error.message?.includes('already registered')) {
          Alert.alert('Registration Failed', 'This email is already registered. Please sign in instead.');
        } else {
          Alert.alert('Registration Failed', error.message || 'An error occurred');
        }
      } else {
        Alert.alert(
          'Welcome to WAVESIGHT!',
          'Your account has been created successfully.',
          [{ text: 'Get Started', style: 'default' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={completeTheme.gradients.dark}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={completeTheme.colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={24} color={completeTheme.colors.primary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={completeTheme.gradients.primary}
                style={styles.logoContainer}
              >
                <Icon name="wave" size={40} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.title}>Join WAVESIGHT</Text>
              <Text style={styles.subtitle}>Start catching trends and earning rewards</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Icon name="account-outline" size={20} color={completeTheme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Full Name"
                    placeholderTextColor={completeTheme.colors.textMuted}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Icon name="email-outline" size={20} color={completeTheme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor={completeTheme.colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Icon name="lock-outline" size={20} color={completeTheme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={completeTheme.colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color={completeTheme.colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Icon name="lock-check-outline" size={20} color={completeTheme.colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm Password"
                    placeholderTextColor={completeTheme.colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon 
                      name={showConfirmPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color={completeTheme.colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementsText}>
                  Password must be at least 6 characters
                </Text>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.9}
                style={styles.registerButtonWrapper}
              >
                <LinearGradient
                  colors={completeTheme.gradients.primary}
                  style={styles.registerButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Terms */}
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: completeTheme.spacing.lg,
  },
  backButton: {
    marginTop: completeTheme.spacing.md,
    marginBottom: completeTheme.spacing.lg,
    width: 48,
    height: 48,
    borderRadius: completeTheme.borderRadius.xl,
    backgroundColor: completeTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: completeTheme.spacing.xl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: completeTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: completeTheme.spacing.lg,
    ...completeTheme.shadows.primary,
  },
  title: {
    fontSize: completeTheme.typography.fontSize['3xl'],
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: completeTheme.colors.text,
    marginBottom: completeTheme.spacing.xs,
  },
  subtitle: {
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: completeTheme.spacing.md,
  },
  form: {
    gap: completeTheme.spacing.md,
  },
  inputWrapper: {
    backgroundColor: completeTheme.colors.surface,
    borderRadius: completeTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: completeTheme.colors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: completeTheme.spacing.lg,
    gap: completeTheme.spacing.md,
  },
  input: {
    flex: 1,
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.text,
    paddingVertical: completeTheme.spacing.lg,
  },
  passwordRequirements: {
    paddingHorizontal: completeTheme.spacing.sm,
  },
  requirementsText: {
    fontSize: completeTheme.typography.fontSize.xs,
    color: completeTheme.colors.textMuted,
  },
  registerButtonWrapper: {
    marginTop: completeTheme.spacing.sm,
    ...completeTheme.shadows.primary,
  },
  registerButton: {
    height: completeTheme.components.button.height.lg,
    borderRadius: completeTheme.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: completeTheme.components.button.fontSize.lg,
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: completeTheme.typography.fontSize.xs,
    color: completeTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: completeTheme.typography.fontSize.xs * completeTheme.typography.lineHeight.relaxed,
    paddingHorizontal: completeTheme.spacing.md,
  },
  termsLink: {
    color: completeTheme.colors.primary,
    fontWeight: completeTheme.typography.fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: completeTheme.spacing.xl,
    marginBottom: completeTheme.spacing.xl,
    paddingTop: completeTheme.spacing.lg,
  },
  footerText: {
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.textSecondary,
  },
  signInText: {
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.primary,
    fontWeight: completeTheme.typography.fontWeight.semibold,
  },
});