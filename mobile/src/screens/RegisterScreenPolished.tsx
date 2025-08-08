import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
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
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { BlurView } from '@react-native-community/blur';
import HapticFeedback from 'react-native-haptic-feedback';
import DatePicker from 'react-native-date-picker';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  birthDate: Date | null;
}

export const RegisterScreenPolished: React.FC = () => {
  const navigation = useNavigation<any>();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    birthDate: null,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const stepProgress = useSharedValue(33.33);

  const validateStep1 = () => {
    if (!formData.username) {
      setError('Please enter a username');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.birthDate) {
      setError('Please select your birth date');
      return false;
    }
    const age = new Date().getFullYear() - formData.birthDate.getFullYear();
    if (age < 13) {
      setError('You must be at least 13 years old');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      setError('Please enter your email');
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (!formData.password) {
      setError('Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      stepProgress.value = withSpring(66.66);
      HapticFeedback.trigger('impactLight');
    } else if (currentStep === 2 && validateStep2()) {
      handleRegister();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      stepProgress.value = withSpring(33.33);
      HapticFeedback.trigger('impactLight');
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    
    try {
      await signUp(
        formData.email, 
        formData.password, 
        formData.username,
        formData.birthDate?.toISOString().split('T')[0] || ''
      );
      stepProgress.value = withSpring(100);
      HapticFeedback.trigger('notificationSuccess');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      HapticFeedback.trigger('notificationError');
    } finally {
      setLoading(false);
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${stepProgress.value}%`,
  }));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#000d1a', '#001a33', '#002244']}
          style={StyleSheet.absoluteFillObject}
        />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              HapticFeedback.trigger('impactLight');
              if (currentStep === 2) {
                handlePreviousStep();
              } else {
                navigation.goBack();
              }
            }}
          >
            <Icon name="arrow-left" size={24} color={enhancedTheme.colors.text} />
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View style={[styles.progressBar, progressAnimatedStyle]}>
                <LinearGradient
                  colors={enhancedTheme.colors.primaryGradient}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
            <Text style={styles.stepText}>Step {currentStep} of 2</Text>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title */}
              <Animated.View 
                entering={FadeInDown.springify()}
                style={styles.titleContainer}
              >
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  {currentStep === 1 
                    ? "Let's get to know you" 
                    : "Secure your account"}
                </Text>
              </Animated.View>

              {/* Form Container */}
              <Animated.View 
                entering={FadeInUp.delay(100).springify()}
                style={styles.formContainer}
              >
                <BlurView
                  style={styles.formBlur}
                  blurType="dark"
                  blurAmount={10}
                  reducedTransparencyFallbackColor="rgba(0, 26, 51, 0.9)"
                >
                  {currentStep === 1 ? (
                    <>
                      {/* Username Input */}
                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          focusedInput === 'username' && styles.inputContainerFocused,
                        ]}>
                          <Icon 
                            name="account-outline" 
                            size={20} 
                            color={focusedInput === 'username' ? enhancedTheme.colors.primary : enhancedTheme.colors.textTertiary}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor={enhancedTheme.colors.textTertiary}
                            value={formData.username}
                            onChangeText={(text) => {
                              setFormData({ ...formData, username: text });
                              setError('');
                            }}
                            onFocus={() => setFocusedInput('username')}
                            onBlur={() => setFocusedInput(null)}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>
                      </View>

                      {/* Birth Date Picker */}
                      <View style={styles.inputWrapper}>
                        <TouchableOpacity
                          onPress={() => {
                            setShowDatePicker(true);
                            HapticFeedback.trigger('impactLight');
                          }}
                        >
                          <View style={[
                            styles.inputContainer,
                            focusedInput === 'birthDate' && styles.inputContainerFocused,
                          ]}>
                            <Icon 
                              name="calendar-outline" 
                              size={20} 
                              color={formData.birthDate ? enhancedTheme.colors.primary : enhancedTheme.colors.textTertiary}
                            />
                            <Text style={[
                              styles.dateText,
                              !formData.birthDate && styles.placeholderText
                            ]}>
                              {formData.birthDate 
                                ? formatDate(formData.birthDate)
                                : 'Birth Date'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>

                      <DatePicker
                        modal
                        open={showDatePicker}
                        date={formData.birthDate || new Date(2000, 0, 1)}
                        mode="date"
                        maximumDate={new Date()}
                        onConfirm={(date) => {
                          setShowDatePicker(false);
                          setFormData({ ...formData, birthDate: date });
                          setError('');
                        }}
                        onCancel={() => {
                          setShowDatePicker(false);
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {/* Email Input */}
                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          focusedInput === 'email' && styles.inputContainerFocused,
                        ]}>
                          <Icon 
                            name="email-outline" 
                            size={20} 
                            color={focusedInput === 'email' ? enhancedTheme.colors.primary : enhancedTheme.colors.textTertiary}
                          />
                          <TextInput
                            ref={emailInputRef}
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={enhancedTheme.colors.textTertiary}
                            value={formData.email}
                            onChangeText={(text) => {
                              setFormData({ ...formData, email: text });
                              setError('');
                            }}
                            onFocus={() => setFocusedInput('email')}
                            onBlur={() => setFocusedInput(null)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>
                      </View>

                      {/* Password Input */}
                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          focusedInput === 'password' && styles.inputContainerFocused,
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
                            value={formData.password}
                            onChangeText={(text) => {
                              setFormData({ ...formData, password: text });
                              setError('');
                            }}
                            onFocus={() => setFocusedInput('password')}
                            onBlur={() => setFocusedInput(null)}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <TouchableOpacity
                            onPress={() => {
                              setShowPassword(!showPassword);
                              HapticFeedback.trigger('impactLight');
                            }}
                          >
                            <Icon 
                              name={showPassword ? "eye-off-outline" : "eye-outline"} 
                              size={20} 
                              color={enhancedTheme.colors.textTertiary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Confirm Password Input */}
                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          focusedInput === 'confirmPassword' && styles.inputContainerFocused,
                        ]}>
                          <Icon 
                            name="lock-check-outline" 
                            size={20} 
                            color={focusedInput === 'confirmPassword' ? enhancedTheme.colors.primary : enhancedTheme.colors.textTertiary}
                          />
                          <TextInput
                            ref={confirmPasswordInputRef}
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor={enhancedTheme.colors.textTertiary}
                            value={formData.confirmPassword}
                            onChangeText={(text) => {
                              setFormData({ ...formData, confirmPassword: text });
                              setError('');
                            }}
                            onFocus={() => setFocusedInput('confirmPassword')}
                            onBlur={() => setFocusedInput(null)}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          <TouchableOpacity
                            onPress={() => {
                              setShowConfirmPassword(!showConfirmPassword);
                              HapticFeedback.trigger('impactLight');
                            }}
                          >
                            <Icon 
                              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                              size={20} 
                              color={enhancedTheme.colors.textTertiary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}

                  {/* Error Message */}
                  {error ? (
                    <Animated.View entering={FadeInDown.springify()}>
                      <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                  ) : null}

                  {/* Action Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      HapticFeedback.trigger('impactMedium');
                      handleNextStep();
                    }}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={enhancedTheme.colors.primaryGradient}
                      style={styles.actionButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Text style={styles.actionButtonText}>
                            {currentStep === 1 ? 'Continue' : 'Create Account'}
                          </Text>
                          <Icon name="arrow-right" size={20} color="#ffffff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </BlurView>
              </Animated.View>

              {/* Sign In Link */}
              <Animated.View 
                entering={FadeInUp.delay(200).springify()}
                style={styles.signinContainer}
              >
                <Text style={styles.signinText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => {
                    HapticFeedback.trigger('impactLight');
                    navigation.navigate('Login');
                  }}
                >
                  <Text style={styles.signinLink}>Sign In</Text>
                </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    marginBottom: 40,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  stepText: {
    color: enhancedTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
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
  input: {
    flex: 1,
    color: enhancedTheme.colors.text,
    fontSize: 16,
    marginLeft: 12,
  },
  dateText: {
    flex: 1,
    color: enhancedTheme.colors.text,
    fontSize: 16,
    marginLeft: 12,
  },
  placeholderText: {
    color: enhancedTheme.colors.textTertiary,
  },
  errorText: {
    color: enhancedTheme.colors.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    color: enhancedTheme.colors.textSecondary,
    fontSize: 14,
  },
  signinLink: {
    color: enhancedTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});