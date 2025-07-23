import React from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PersonaBuilder from '../components/PersonaBuilder/PersonaBuilder';
import { PersonaData } from '../types/persona';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';

export const PersonaBuilderScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

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

      Alert.alert(
        'Persona Created!',
        'Your persona has been saved. You\'ll now receive personalized trend insights.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
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