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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { useAuth } from '../hooks/useAuth';
import { completeTheme } from '../styles/theme.complete';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreenComplete: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
        } else if (error.message?.includes('Invalid')) {
          Alert.alert('Login Failed', 'Invalid email or password');
        } else {
          Alert.alert('Login Failed', error.message || 'An error occurred');
        }
      }
    } catch (error: any) {
      Alert.alert('Login Failed', 'Unable to sign in. Please try again.');
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
          <View style={styles.content}>
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
                <Icon name="wave" size={48} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Track trends, earn rewards</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
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

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                style={styles.loginButtonWrapper}
              >
                <LinearGradient
                  colors={completeTheme.gradients.primary}
                  style={styles.loginButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => Alert.alert('Coming Soon', 'Password reset will be available soon')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  content: {
    flex: 1,
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
    marginBottom: completeTheme.spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: completeTheme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: completeTheme.spacing.lg,
    ...completeTheme.shadows.primary,
  },
  title: {
    fontSize: completeTheme.typography.fontSize['4xl'],
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: completeTheme.colors.text,
    marginBottom: completeTheme.spacing.xs,
  },
  subtitle: {
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.textSecondary,
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
  loginButtonWrapper: {
    marginTop: completeTheme.spacing.sm,
    ...completeTheme.shadows.primary,
  },
  loginButton: {
    height: completeTheme.components.button.height.lg,
    borderRadius: completeTheme.borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: completeTheme.components.button.fontSize.lg,
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: completeTheme.spacing.md,
  },
  forgotPasswordText: {
    fontSize: completeTheme.typography.fontSize.sm,
    color: completeTheme.colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: completeTheme.spacing.xl,
    paddingTop: completeTheme.spacing.lg,
  },
  footerText: {
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.textSecondary,
  },
  signUpText: {
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.primary,
    fontWeight: completeTheme.typography.fontWeight.semibold,
  },
});