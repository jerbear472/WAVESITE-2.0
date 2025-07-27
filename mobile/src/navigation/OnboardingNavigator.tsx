import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PersonaBuilderScreen } from '../screens/PersonaBuilderScreen';
import { VenmoSetupScreen } from '../screens/VenmoSetupScreen';
import { enhancedTheme } from '../styles/theme.enhanced';

export type OnboardingStackParamList = {
  PersonaBuilder: undefined;
  VenmoSetup: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: enhancedTheme.colors.background,
        },
        headerTintColor: enhancedTheme.colors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: enhancedTheme.colors.background },
      }}
    >
      <Stack.Screen
        name="PersonaBuilder"
        component={PersonaBuilderScreen}
        options={{
          headerTitle: 'Build Your Persona',
          headerBackVisible: false,
          gestureEnabled: false, // Prevent swiping back
        }}
      />
      <Stack.Screen
        name="VenmoSetup"
        component={VenmoSetupScreen}
        options={{
          headerTitle: 'Payment Setup',
          headerBackVisible: false,
          gestureEnabled: false, // Prevent swiping back
        }}
      />
    </Stack.Navigator>
  );
};