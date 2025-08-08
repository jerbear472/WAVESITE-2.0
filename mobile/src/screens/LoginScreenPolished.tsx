import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { BlurView } from '@react-native-community/blur';
import HapticFeedback from 'react-native-haptic-feedback';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoginScreenPolished: React.FC = () => {
  const navigation = useNavigation<any>();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const passwordInputRef = useRef<TextInput>(null);
  const keyboardHeight = useSharedValue(0);
  const logoScale = useSharedValue(1);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withSpring(e.endCoordinates.height);
        logoScale.value = withSpring(0.7);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.value = withSpring(0);
        logoScale.value = withSpring(1);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      HapticFeedback.trigger('notificationWarning');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await signIn(email, password);
      HapticFeedback.trigger('notificationSuccess');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
      HapticFeedback.trigger('notificationError');
    } finally {
      setLoading(false);
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          keyboardHeight.value,
          [0, 300],
          [0, -50],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#000d1a', '#001a33', '#002244']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Animated Background Elements */}
        <View style={styles.backgroundElements}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View style={[styles.contentContainer, containerAnimatedStyle]}>
                {/* Logo and Title */}
                <Animated.View 
                  entering={FadeInDown.delay(100).springify()}
                  style={[styles.logoContainer, logoAnimatedStyle]}
                >
                  <View style={styles.logoWrapper}>
                    <LinearGradient
                      colors={enhancedTheme.colors.primaryGradient}
                      style={styles.logoGradient}
                    >
                      <Image
                        source={require('../assets/images/logo2.png')}
                        style={styles.logo}
                        resizeMode="cover"
                      />
                    </LinearGradient>
                  </View>
                  <Text style={styles.title}>WAVESIGHT</Text>
                  <Text style={styles.subtitle}>Spot the Next Wave</Text>
                </Animated.View>

                {/* Login Form */}
                <Animated.View 
                  entering={FadeInUp.delay(200).springify()}
                  style={styles.formContainer}
                >
                  <BlurView
                    style={styles.formBlur}
                    blurType="dark"
                    blurAmount={10}
                    reducedTransparencyFallbackColor="rgba(0, 26, 51, 0.9)"
                  >
                    {/* Email Input */}
                    <View style={styles.inputWrapper}>
                      <View style={[
                        styles.inputContainer,
                        focusedInput === 'email' && styles.inputContainerFocused,
                        error && !email && styles.inputContainerError,
                      ]}>
                        <Icon 
                          name="email-outline" 
                          size={20} 
                          color={focusedInput === 'email' ? enhancedTheme.colors.primary : enhancedTheme.colors.textTertiary}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Email"
                          placeholderTextColor={enhancedTheme.colors.textTertiary}
                          value={email}
                          onChangeText={(text) => {
                            setEmail(text);
                            setError('');
                          }}
                          onFocus={() => setFocusedInput('email')}
                          onBlur={() => setFocusedInput(null)}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                          onSubmitEditing={() => passwordInputRef.current?.focus()}
                        />
                      </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputWrapper}>
                      <View style={[
                        styles.inputContainer,
                        focusedInput === 'password' && styles.inputContainerFocused,
                        error && !password && styles.inputContainerError,
                      ]}>
                        <Icon 
                          name="lock-outline" 
                          size={20} 
                          color={focusedInput === 'password' ? enhancedTheme.colors.primary : enhancedTheme.colors.textTertiary}
                        />
                        <TextInput
                          ref={passwordInputRef}
                          style={styles.input}
                          placeholder="Password"
                          placeholderTextColor={enhancedTheme.colors.textTertiary}
                          value={password}
                          onChangeText={(text) => {
                            setPassword(text);
                            setError('');
                          }}
                          onFocus={() => setFocusedInput('password')}
                          onBlur={() => setFocusedInput(null)}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="done"
                          onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setShowPassword(!showPassword);
                            HapticFeedback.trigger('impactLight');
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Icon 
                            name={showPassword ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color={enhancedTheme.colors.textTertiary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Error Message */}
                    {error ? (
                      <Animated.View entering={FadeInDown.springify()}>
                        <Text style={styles.errorText}>{error}</Text>
                      </Animated.View>
                    ) : null}

                    {/* Forgot Password */}
                    <TouchableOpacity 
                      style={styles.forgotPasswordButton}
                      onPress={() => {
                        HapticFeedback.trigger('impactLight');
                        navigation.navigate('ForgotPassword');
                      }}
                    >
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        HapticFeedback.trigger('impactMedium');
                        handleLogin();
                      }}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={enhancedTheme.colors.primaryGradient}
                        style={styles.loginButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Text style={styles.loginButtonText}>Sign In</Text>
                            <Icon name="arrow-right" size={20} color="#ffffff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                      <View style={styles.divider} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.divider} />
                    </View>

                    {/* Social Login */}
                    <View style={styles.socialContainer}>
                      <TouchableOpacity 
                        style={styles.socialButton}
                        onPress={() => {
                          HapticFeedback.trigger('impactLight');
                        }}
                      >
                        <View style={styles.socialButtonContent}>
                          <Icon name="google" size={20} color="#DB4437" />
                          <Text style={styles.socialButtonText}>Google</Text>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.socialButton}
                        onPress={() => {
                          HapticFeedback.trigger('impactLight');
                        }}
                      >
                        <View style={styles.socialButtonContent}>
                          <Icon name="apple" size={20} color={enhancedTheme.colors.text} />
                          <Text style={styles.socialButtonText}>Apple</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                </Animated.View>

                {/* Sign Up Link */}
                <Animated.View 
                  entering={FadeInUp.delay(300).springify()}
                  style={styles.signupContainer}
                >
                  <Text style={styles.signupText}>Don't have an account? </Text>
                  <TouchableOpacity
                    onPress={() => {
                      HapticFeedback.trigger('impactLight');
                      navigation.navigate('Register');
                    }}
                  >
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(0, 128, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    left: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    top: '40%',
    right: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    bottom: 100,
    left: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    padding: 3,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: enhancedTheme.colors.text,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    fontWeight: '500',
  },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  formBlur: {
    padding: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputContainerFocused: {
    borderColor: enhancedTheme.colors.primary,
    backgroundColor: 'rgba(0, 128, 255, 0.05)',
  },
  inputContainerError: {
    borderColor: enhancedTheme.colors.error,
  },
  input: {
    flex: 1,
    color: enhancedTheme.colors.text,
    fontSize: 16,
    marginLeft: 12,
  },
  errorText: {
    color: enhancedTheme.colors.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: enhancedTheme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: enhancedTheme.colors.textTertiary,
    fontSize: 12,
    marginHorizontal: 16,
    fontWeight: '600',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonText: {
    color: enhancedTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: enhancedTheme.colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: enhancedTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});