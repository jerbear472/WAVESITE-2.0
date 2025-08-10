import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import PersonalizationScreen from '../screens/onboarding/PersonalizationScreen';
import PermissionsScreen from '../screens/onboarding/PermissionsScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Personalization: undefined;
  Permissions: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="Welcome" component={OnboardingScreen} />
      <Stack.Screen name="Personalization" component={PersonalizationScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  );
};