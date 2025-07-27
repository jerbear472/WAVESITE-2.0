import React from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PersonaBuilder from '../components/PersonaBuilder/PersonaBuilder';
import { PersonaData } from '../types/persona';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { OnboardingStackParamList } from '../navigation/OnboardingNavigator';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'PersonaBuilder'>;

export const PersonaBuilderScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, refreshUser } = useAuth();

  const handleComplete = async (personaData: PersonaData) => {
    try {
      // Save persona data to user profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          demographics: personaData.demographics,
          interests: personaData.interests,
          location: personaData.location,
          professional: personaData.professional,
          lifestyle: personaData.lifestyle,
          tech: personaData.tech,
          persona_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Refresh user data to update persona_completed status
      await refreshUser();

      // Navigate to Venmo setup
      navigation.navigate('VenmoSetup');
    } catch (error) {
      console.error('Error saving persona:', error);
      Alert.alert(
        'Error',
        'Failed to save your persona. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return <PersonaBuilder onComplete={handleComplete} />;
};