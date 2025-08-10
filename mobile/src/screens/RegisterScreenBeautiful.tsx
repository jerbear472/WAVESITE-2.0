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
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { Card } from '../components/ui/Card';
import { theme } from '../styles/theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreenBeautiful: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Pass username directly (no persona required)
      await signUp(email, password, username);
      Alert.alert(
        'Success!', 
        'Your account has been created. Welcome to WaveSight!',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Logo size="medium" showText={true} />
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Join the trend-spotting community</Text>
          </View>

          <Card style={styles.formCard} padding="large" variant="elevated">
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, username && styles.inputFilled]}
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, email && styles.inputFilled]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, password && styles.inputFilled]}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min 6 chars)"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, confirmPassword && styles.inputFilled]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="large"
              style={styles.registerButton}
            />

            <View style={styles.terms}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.link}>Terms of Service</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </View>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

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
    bottom: 0,
    opacity: 0.3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  formCard: {
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  inputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.wave[50],
  },
  registerButton: {
    marginTop: theme.spacing.sm,
  },
  terms: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  termsText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  linkText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});