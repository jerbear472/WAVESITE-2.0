import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { Button } from '../components/Button';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'VenmoSetup'>;

export const VenmoSetupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, refreshUser } = useAuth();
  const [venmoUsername, setVenmoUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveVenmo = async () => {
    if (!venmoUsername.trim()) {
      Alert.alert('Error', 'Please enter your Venmo username');
      return;
    }

    // Validate Venmo username format (alphanumeric, hyphens, underscores)
    const venmoRegex = /^[a-zA-Z0-9_-]+$/;
    if (!venmoRegex.test(venmoUsername)) {
      Alert.alert('Error', 'Venmo username can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          venmo_username: venmoUsername.trim(),
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Refresh user data to update onboarding status
      await refreshUser();
      
      // The RootNavigator will automatically redirect to the app
      // when it detects onboarding_completed is true
    } catch (error) {
      console.error('Error saving Venmo username:', error);
      Alert.alert('Error', 'Failed to save your Venmo username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Payment Setup?',
      'You won\'t be able to receive payouts without setting up a payment method. You can add it later in your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip for Now',
          onPress: async () => {
            try {
              await supabase
                .from('user_profiles')
                .update({
                  onboarding_completed: true,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);
              
              await refreshUser();
            } catch (error) {
              console.error('Error updating onboarding status:', error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Icon name="cash-multiple" size={60} color={enhancedTheme.colors.primary} />
                </View>
                <Text style={styles.title}>Set Up Payments</Text>
                <Text style={styles.subtitle}>
                  Add your Venmo username to receive payouts for your trend discoveries
                </Text>
              </View>

              <GlassCard style={styles.card}>
                <View style={styles.venmoInfo}>
                  <Icon name="information-outline" size={20} color={enhancedTheme.colors.textSecondary} />
                  <Text style={styles.infoText}>
                    We use Venmo for fast, secure payments. Payouts are sent weekly for validated trends.
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Venmo Username</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.atSymbol}>@</Text>
                    <TextInput
                      style={styles.input}
                      value={venmoUsername}
                      onChangeText={setVenmoUsername}
                      placeholder="your-venmo-username"
                      placeholderTextColor={enhancedTheme.colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="default"
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Enter your Venmo username without the @ symbol
                  </Text>
                </View>

                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleTitle}>Example:</Text>
                  <View style={styles.exampleBox}>
                    <Text style={styles.exampleText}>@john-doe-123</Text>
                  </View>
                </View>
              </GlassCard>

              <View style={styles.buttonContainer}>
                <Button
                  title="Save & Continue"
                  onPress={handleSaveVenmo}
                  loading={loading}
                  size="large"
                  style={styles.saveButton}
                />
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Skip for Now</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.securityNote}>
                <Icon name="shield-check" size={16} color={enhancedTheme.colors.success} />
                <Text style={styles.securityText}>
                  Your payment information is encrypted and secure
                </Text>
              </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: enhancedTheme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: enhancedTheme.colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    padding: 20,
    marginBottom: 30,
  },
  venmoInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: enhancedTheme.colors.info + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: enhancedTheme.colors.text,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.backgroundTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.border,
  },
  atSymbol: {
    fontSize: 18,
    color: enhancedTheme.colors.textSecondary,
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 16,
    fontSize: 16,
    color: enhancedTheme.colors.text,
  },
  helperText: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 6,
  },
  exampleContainer: {
    backgroundColor: enhancedTheme.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  exampleBox: {
    backgroundColor: enhancedTheme.colors.backgroundTertiary,
    padding: 12,
    borderRadius: 6,
  },
  exampleText: {
    fontSize: 16,
    color: enhancedTheme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonContainer: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: enhancedTheme.colors.primary,
    shadowColor: enhancedTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  securityText: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
    marginLeft: 6,
  },
});